import type { RoleKind } from '@prisma/client';

/**
 * Role names are rows in the `Role` table, so admins can add their own staff
 * roles. Authorization never keys off a name, only off the role's `kind`:
 * CUSTOMER (self-service shoppers), VENDOR (marketplace shop owners) or
 * STAFF (platform back office).
 */
export const CUSTOMER_ROLE_NAME = 'User';
export const VENDOR_ROLE_NAME = 'Vendor';

export const isStaffKind = (kind?: RoleKind | null): boolean => kind === 'STAFF';
export const isVendorKind = (kind?: RoleKind | null): boolean => kind === 'VENDOR';

/** Platform back-office staff — never a customer or a vendor. */
export const isStaffUser = (user?: { roleKind?: RoleKind | null } | null): boolean =>
  isStaffKind(user?.roleKind);
