import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, STAFF_KEY } from '../decorators/roles.decorator';
import { isStaffUser } from '../roles.constants';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Authorises the user attached by JwtAuthGuard. Must run after it — on its own
 * this guard has no one to check, so it denies.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      targets,
    );
    const staffOnly = this.reflector.getAllAndOverride<boolean>(
      STAFF_KEY,
      targets,
    );

    if (!requiredRoles?.length && !staffOnly) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>().user;

    if (!user) {
      throw new ForbiddenException('This action requires an active session');
    }

    if (requiredRoles?.length) {
      if (!requiredRoles.includes(user.roleName)) {
        throw new ForbiddenException(
          'Your role does not have access to this resource',
        );
      }
      return true;
    }

    if (!isStaffUser(user)) {
      throw new ForbiddenException(
        'This resource is restricted to back-office staff',
      );
    }

    return true;
  }
}
