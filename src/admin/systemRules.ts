import type { UserResponse } from '@/lib/types';
import type { SystemRole } from './systemTypes';
import { adminPermissions, canEnterAdmin } from './access';
export const refundAmountPattern = '(?=.*[1-9])[0-9]{1,17}(\\.[0-9]{1,2})?';

export const statusNames: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  DISABLED: 'Vô hiệu hóa',
};
export const roleNames: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  USER: 'Khách hàng',
};
export function canChangeUser(actor: UserResponse, target: UserResponse) {
  return (
    !target.roles.includes('ADMIN') &&
    (!target.roles.includes('STAFF') || actor.roles.includes('ADMIN'))
  );
}
export function assignableRoles(
  actor: UserResponse,
  permissions: ReadonlySet<string>,
  roles: SystemRole[],
  target: UserResponse,
) {
  if (!canChangeUser(actor, target)) return [];
  return roles.filter(
    (r) =>
      r.code !== 'ADMIN' &&
      (actor.roles.includes('ADMIN') ||
        (r.code !== 'STAFF' && r.permissions.every((p) => permissions.has(p)))),
  );
}
export function canManageRoles(
  actor: UserResponse,
  permissions: ReadonlySet<string>,
) {
  return actor.roles.includes('ADMIN') && permissions.has('SYSTEM_ROLE_MANAGE');
}
export function safeReturnPath(path?: string) {
  return path &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !/[\\\u0000-\u0020]/.test(path) &&
    !/^\/(login|register)([/?#]|$)/.test(path)
    ? path
    : '/';
}
export function loginDestination(
  user: UserResponse,
  token: string | undefined,
  intended?: string,
) {
  const path = safeReturnPath(intended);
  return canEnterAdmin(adminPermissions(user, token))
    ? /^\/admin([/?#]|$)/.test(path)
      ? path
      : '/admin'
    : path;
}
