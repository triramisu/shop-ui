import { useMemo } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { adminPermissions, canEnterAdmin } from './access';

export function useAdminAccess() {
  const auth = useAuth();
  const permissions = useMemo(
    () => adminPermissions(auth.user, auth.session?.accessToken),
    [auth.user, auth.session?.accessToken],
  );
  return {
    ...auth,
    permissions,
    canEnter: !auth.loadingUser && canEnterAdmin(permissions),
  };
}
