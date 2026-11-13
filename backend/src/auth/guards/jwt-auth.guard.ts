import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid JWT — rejects with 401 if missing or invalid. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
