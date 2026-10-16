import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/api/auth';
import { useQueryClient } from '@tanstack/react-query';
import { clearCustomerQueries } from '@/lib/customerCache';
import {
  clearSession,
  getSession,
  setSession,
  subscribe,
  type Session,
} from '@/lib/session';
import type {
  AuthenticationRequest,
  RegisterUserRequest,
  UserResponse,
} from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: UserResponse | null;
  loadingUser: boolean;
  isAuthenticated: boolean;
  login: (req: AuthenticationRequest) => Promise<void>;
  register: (req: RegisterUserRequest) => Promise<UserResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const profileRequest = useRef(0);
  const [session, setSessionState] = useState<Session | null>(() =>
    getSession(),
  );
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(!!getSession());

  useEffect(
    () =>
      subscribe((nextSession) => {
        setSessionState(nextSession);
        if (!nextSession) {
          profileRequest.current += 1;
          setUser(null);
          setLoadingUser(false);
          clearCustomerQueries(queryClient);
        }
      }),
    [queryClient],
  );

  const refreshUser = useCallback(async () => {
    const request = ++profileRequest.current;
    if (!getSession()) {
      setUser(null);
      setLoadingUser(false);
      return;
    }
    setLoadingUser(true);
    try {
      const nextUser = await authApi.myInfo();
      if (request === profileRequest.current && getSession()) setUser(nextUser);
    } catch {
      if (request === profileRequest.current) setUser(null);
    } finally {
      if (request === profileRequest.current) setLoadingUser(false);
    }
  }, []);

  // Nạp hồ sơ mỗi khi có/đổi phiên.
  useEffect(() => {
    if (session) void refreshUser();
    else setUser(null);
  }, [session?.accessToken, refreshUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(
    async (req: AuthenticationRequest) => {
      const auth = await authApi.login(req);
      profileRequest.current += 1;
      setUser(null);
      setLoadingUser(true);
      clearCustomerQueries(queryClient);
      setSession(auth);
      await refreshUser();
    },
    [refreshUser, queryClient],
  );

  const register = useCallback(
    (req: RegisterUserRequest) => authApi.register(req),
    [],
  );

  const logout = useCallback(async () => {
    const s = getSession();
    clearSession();
    clearCustomerQueries(queryClient);
    setUser(null);
    if (s?.refreshToken) {
      try {
        await authApi.logout(s.refreshToken); // thu hồi cả refresh-token family
      } catch {
        /* vẫn xóa phiên phía client dù logout server lỗi */
      }
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loadingUser,
      isAuthenticated: !!session,
      login,
      register,
      logout,
      refreshUser,
    }),
    [session, user, loadingUser, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong <AuthProvider>');
  return ctx;
}
