import type { RoleKind } from '@prisma/client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

export type JwtPayload = { sub: string; email: string; role: string };

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  roleKind: RoleKind;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_secret_key',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Keyed by the user id, not the email: an email can change, or be freed
    // and re-registered by someone else, and the session must not follow it.
    const user = await this.usersService.findSessionUser(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.role.name,
      roleKind: user.role.kind,
    };
  }
}
