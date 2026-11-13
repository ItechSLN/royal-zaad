import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'auth:roles';
export const STAFF_KEY = 'auth:staff';

/** Restricts a route to the named roles. Pair with JwtAuthGuard + RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Restricts a route to any back-office role (anything other than the
 * self-service customer role). Pair with JwtAuthGuard + RolesGuard.
 */
export const Staff = () => SetMetadata(STAFF_KEY, true);
