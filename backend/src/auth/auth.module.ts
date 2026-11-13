import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Sign-in, registration and password-reset attempts allowed per client IP per
 * minute. Strict in production to blunt password guessing; relaxed in
 * development so automated test runs don't trip it. AUTH_RATE_LIMIT overrides.
 */
const AUTH_RATE_LIMIT = Number(
  process.env.AUTH_RATE_LIMIT ??
    (process.env.NODE_ENV === 'production' ? 10 : 1000),
);

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: AUTH_RATE_LIMIT }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret_key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
