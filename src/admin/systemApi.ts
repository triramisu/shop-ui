import { apiRequest } from '@/lib/apiClient';
import type { UserResponse } from '@/lib/types';
import type { Page } from './types';
import type {
  ProfileInput,
  Refund,
  RefundInput,
  RoleInput,
  SystemPermission,
  SystemRole,
  SystemUser,
  UserStatus,
} from './systemTypes';

const base = '/system-administration';
function uuid(id: string) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    throw Error('Mã tài nguyên không hợp lệ.');
  return id;
}
function roleCode(code: string) {
  if (!/^[A-Z][A-Z0-9_]{2,49}$/.test(code))
    throw Error('Mã vai trò không hợp lệ.');
  return code;
}
const write = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, { method, body, retryAuth: false });
export const systemApi = {
  users: (
    query: { keyword?: string; status?: string; page?: number; size?: number },
    signal?: AbortSignal,
  ) => apiRequest<Page<SystemUser>>(`${base}/users`, { query, signal }),
  user: (id: string, signal?: AbortSignal) =>
    apiRequest<SystemUser>(`${base}/users/${uuid(id)}`, { signal }),
  status: (id: string, status: UserStatus) =>
    write<SystemUser>(`${base}/users/${uuid(id)}/status`, 'PATCH', { status }),
  userRoles: (id: string, roleCodes: string[]) =>
    write<SystemUser>(`${base}/users/${uuid(id)}/roles`, 'PUT', { roleCodes }),
  roles: (signal?: AbortSignal) =>
    apiRequest<SystemRole[]>(`${base}/roles`, { signal }),
  permissions: (signal?: AbortSignal) =>
    apiRequest<SystemPermission[]>(`${base}/permissions`, { signal }),
  createRole: (body: RoleInput & { code: string }) =>
    write<SystemRole>(`${base}/roles`, 'POST', body),
  updateRole: (code: string, body: RoleInput) =>
    write<SystemRole>(`${base}/roles/${roleCode(code)}`, 'PUT', body),
  deleteRole: (code: string) =>
    write<void>(`${base}/roles/${roleCode(code)}`, 'DELETE'),
  profile: (body: ProfileInput) =>
    write<UserResponse>('/auth/my-info', 'PUT', body),
  password: (body: { currentPassword: string; newPassword: string }) =>
    write<void>('/auth/my-info/password', 'PUT', body),
  refund: (payment: string, id: string, signal?: AbortSignal) =>
    apiRequest<Refund>(`/admin/payments/${uuid(payment)}/refunds/${uuid(id)}`, {
      signal,
      retryAuth: false,
    }),
  createRefund: (payment: string, key: string, body: RefundInput) => {
    if (!/^[\x21-\x7e]{1,100}$/.test(key))
      throw Error('Mã idempotency không hợp lệ.');
    return apiRequest<Refund>(`/admin/payments/${uuid(payment)}/refunds`, {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': key },
      retryAuth: false,
    });
  },
};
