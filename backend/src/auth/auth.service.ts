import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import type {
  CreateAuthDto,
  ForgotPasswordDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import { CUSTOMER_ROLE_NAME, isStaffKind } from './roles.constants';
import type { RoleKind } from '@prisma/client';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Back-office sessions carry far more power, so they expire after a working
// day; customers stay signed in for a week.
const STAFF_SESSION_TTL = '8h';
const VENDOR_SESSION_TTL = '12h';
const CUSTOMER_SESSION_TTL = '7d';
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SESSION_TTL: Record<RoleKind, string> = {
  STAFF: STAFF_SESSION_TTL,
  VENDOR: VENDOR_SESSION_TTL,
  CUSTOMER: CUSTOMER_SESSION_TTL,
};
const DEFAULT_CUSTOMER_ROLE_NAME = CUSTOMER_ROLE_NAME;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async signIn(createAuthDto: CreateAuthDto) {
    const { email, password } = createAuthDto;
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({ message: 'This account has been deactivated' });
    }

    return this.buildSession(user.id, user.email, user.roleId, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    }, user.role?.kind);
  }

  /**
   * Back-office sign-in. Same credential check as signIn, plus a role check —
   * otherwise any self-registered customer could obtain a session from the
   * admin login screen.
   */
  async staffSignIn(createAuthDto: CreateAuthDto) {
    const { email, password } = createAuthDto;
    const user = await this.usersService.findByEmail(email);

    // Deliberately the same error as bad credentials: don't reveal that the
    // account exists but lacks back-office access.
    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash)) ||
      !isStaffKind(user.role?.kind)
    ) {
      throw new UnauthorizedException({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'This account has been deactivated',
      });
    }

    return this.buildSession(user.id, user.email, user.roleId, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    }, user.role?.kind);
  }

  async register(data: RegisterDto) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { email: 'An account with this email already exists' },
      });
    }

    const role = await this.prisma.role.findFirst({ where: { name: DEFAULT_CUSTOMER_ROLE_NAME } });
    if (!role) {
      throw new BadRequestException({
        message: `Default "${DEFAULT_CUSTOMER_ROLE_NAME}" role is not configured`,
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // One transaction, so a failure never leaves a login without a profile.
    // A customer record staff created for this email (no login yet) is
    // linked rather than duplicated, keeping its order history.
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          roleId: role.id,
        },
      });

      const profile = await tx.customer.findUnique({ where: { email: data.email } });
      if (profile?.userId) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { email: 'An account with this email already exists' },
        });
      }

      if (profile) {
        await tx.customer.update({
          where: { id: profile.id },
          data: { userId: created.id },
        });
      } else {
        await tx.customer.create({
          data: {
            userId: created.id,
            email: created.email,
            firstName: created.firstName,
            lastName: created.lastName,
          },
        });
      }

      return created;
    });

    void this.sendVerification(user.id).catch(() => undefined);

    return this.buildSession(user.id, user.email, user.roleId, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    }, 'CUSTOMER');
  }

  async me(currentUser: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { userId: currentUser.id } });

    return {
      id: currentUser.id,
      email: currentUser.email,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      role: currentUser.roleName,
      roleKind: currentUser.roleKind,
      emailVerified: !!(
        await this.prisma.user.findUnique({
          where: { id: currentUser.id },
          select: { emailVerifiedAt: true },
        })
      )?.emailVerifiedAt,
      customerId: customer?.id ?? null,
    };
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(data.email);

    // Always respond the same way whether or not the email exists, to avoid
    // leaking which emails are registered.
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = this.mail.appUrl(`/auth/reset-password?token=${token}`);
    const { html, text } = this.mail.layout(
      'Reset your password',
      [
        `Hi ${user.firstName}, we received a request to reset your password.`,
        'This link expires in one hour. If you did not ask for it, you can ignore this email.',
      ],
      { label: 'Choose a new password', url: resetUrl },
    );
    await this.mail.send({ to: user.email, subject: 'Reset your password', html, text });

    const message = 'If that email is registered, a reset link has been sent.';

    // Development without SMTP has no inbox to read, so hand the link back.
    // Never in production: the link is a credential.
    if (!this.mail.isConfigured && process.env.NODE_ENV !== 'production') {
      return { message, resetToken: token, resetUrl };
    }

    return { message };
  }

  async resetPassword(data: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token: data.token } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { token: 'This reset link is invalid or has expired' },
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Password has been reset successfully.' };
  }

  /** A signed session for a user who has just been created or verified. */
  async sessionFor(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    roleId: string;
    role: { kind: RoleKind };
  }) {
    return this.buildSession(user.id, user.email, user.roleId, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    }, user.role.kind);
  }

  /** Shop-owner sign-in: same credential check, vendor accounts only. */
  async vendorSignIn(createAuthDto: CreateAuthDto) {
    const { email, password } = createAuthDto;
    const user = await this.usersService.findByEmail(email);

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash)) ||
      user.role?.kind !== 'VENDOR'
    ) {
      throw new UnauthorizedException({ message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      throw new UnauthorizedException({ message: 'This account has been deactivated' });
    }

    return this.sessionFor(user);
  }

  /** Emails a one-time, 24-hour link that confirms the address. Never throws. */
  async sendVerification(userId: string): Promise<{ verifyUrl?: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerifiedAt) return {};

    const token = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) },
    });

    const verifyUrl = this.mail.appUrl(`/auth/verify-email?token=${token}`);
    const { html, text } = this.mail.layout(
      'Confirm your email',
      [`Hi ${user.firstName}, please confirm this is your email address.`, 'The link expires in 24 hours.'],
      { label: 'Confirm email', url: verifyUrl },
    );
    await this.mail.send({ to: user.email, subject: 'Confirm your email', html, text });

    // Development without SMTP has no inbox — hand the link back (never in production).
    return !this.mail.isConfigured && process.env.NODE_ENV !== 'production'
      ? { verifyUrl }
      : {};
  }

  async resendVerification(currentUser: AuthenticatedUser) {
    const result = await this.sendVerification(currentUser.id);
    return { message: 'If your email still needs confirming, a new link has been sent.', ...result };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { token: 'This confirmation link is invalid or has expired' },
      });
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: now } }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: now },
      }),
    ]);
    return { message: 'Email confirmed.' };
  }

  private async buildSession(
    userId: string,
    email: string,
    roleId: string,
    user: { id: string; email: string; firstName: string; lastName: string; isActive: boolean },
    roleKind?: RoleKind | null,
  ) {
    const payload = { sub: userId, email, role: roleId };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: SESSION_TTL[roleKind ?? 'CUSTOMER'] as never,
    });

    return { status: 'success', token, user };
  }
}
