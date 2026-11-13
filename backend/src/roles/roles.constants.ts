import { CUSTOMER_ROLE_NAME, VENDOR_ROLE_NAME } from '../auth/roles.constants';

/** The role that manages staff accounts, roles, settings and the audit trail. */
export const ADMIN_ROLE_NAME = 'Admin';

/**
 * Roles the code depends on by name: renaming or deleting either would lock
 * every admin out, or stop customers or vendors from signing up.
 */
export const BUILT_IN_ROLE_NAMES = [ADMIN_ROLE_NAME, CUSTOMER_ROLE_NAME, VENDOR_ROLE_NAME];
