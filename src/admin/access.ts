import type { UserResponse } from '@/lib/types';

export const capabilities = [
  'CATALOG_READ',
  'CATALOG_WRITE',
  'CATALOG_PUBLISH',
  'CATALOG_IMAGE_MANAGE',
  'INVENTORY_READ',
  'INVENTORY_WRITE',
  'SYSTEM_USER_READ',
  'SYSTEM_USER_STATUS_UPDATE',
  'SYSTEM_USER_ROLE_ASSIGN',
  'SYSTEM_ROLE_READ',
  'SYSTEM_ROLE_MANAGE',
  'SYSTEM_PERMISSION_READ',
  'PAYMENT_REFUND',
] as const;
export type Capability = (typeof capabilities)[number];

/** Presentation hint only. API authorization remains entirely server-side. */
export function adminPermissions(
  user: UserResponse | null,
  token?: string,
  now = Date.now(),
): Set<Capability> {
  if (
    !user ||
    user.status !== 'ACTIVE' ||
    !Array.isArray(user.roles) ||
    !user.roles.some((r) => r !== 'USER' && /^[A-Z][A-Z0-9_]{2,49}$/.test(r)) ||
    !token ||
    token.length > 32000
  )
    return new Set();
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[2]) return new Set();
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(
      atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, '=')),
      (c) => c.charCodeAt(0),
    );
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    if (
      claims.sub !== user.username ||
      claims.token_type !== 'access' ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp * 1000 <= now ||
      typeof claims.scope !== 'string'
    )
      return new Set();
    const scopes = new Set<string>(claims.scope.split(/\s+/));
    if (
      !user.roles.some(
        (r) =>
          r !== 'USER' &&
          /^[A-Z][A-Z0-9_]{2,49}$/.test(r) &&
          scopes.has(`ROLE_${r}`),
      )
    )
      return new Set();
    return new Set(capabilities.filter((c) => scopes.has(c)));
  } catch {
    return new Set();
  }
}
export function canEnterAdmin(permissions: ReadonlySet<Capability>) {
  return [
    'CATALOG_READ',
    'INVENTORY_READ',
    'SYSTEM_USER_READ',
    'SYSTEM_ROLE_READ',
    'SYSTEM_PERMISSION_READ',
    'PAYMENT_REFUND',
  ].some((p) => permissions.has(p as Capability));
}
export function adminQueryKey(
  userId: string,
  resource: string,
  ...parts: unknown[]
) {
  return ['admin', userId, resource, ...parts] as const;
}
