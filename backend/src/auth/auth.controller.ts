import { Body, Controller, Get, Post, UseGuards, Version } from '@nestjs/common';
import {
  CreateAuthDto,
  ForgotPasswordDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/signin')
  @Version('1')
  async adminSignIn(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.staffSignIn(createAuthDto);
  }

  @Post('vendor/signin')
  @Version('1')
  async vendorSignIn(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.vendorSignIn(createAuthDto);
  }

  @Post('verify-email')
  @Version('1')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    return this.authService.verifyEmail(data.token);
  }

  @Post('resend-verification')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  async resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.resendVerification(user);
  }

  @Post('login')
  @Version('1')
  async login(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.signIn(createAuthDto);
  }

  @Post('register')
  @Version('1')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  @Version('1')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Version('1')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('me')
  @Version('1')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
