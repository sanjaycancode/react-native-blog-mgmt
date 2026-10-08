import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authApi } from "@/api/services/auth";

import { clearReactQueryCache } from "@/lib/react-query/queryClient";

import { getAsyncStorageItem, setAsyncStorageItem } from "@/utils/asyncStorage";
import { setAccessToken, setAuthHandlers } from "@/utils/authToken";

import type { LoginPayload } from "@/types";

type AuthResponse = {
  user: Awaited<ReturnType<typeof authApi.login>>["data"]["payload"];
  token: Awaited<ReturnType<typeof authApi.login>>["data"]["token"];
};

interface AuthContextValue {
  session: AuthResponse | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_SESSION_STORAGE_KEY = "auth_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const sessionRef = useRef<AuthResponse | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const login = useCallback(async (payload: LoginPayload) => {
    // Throws on bad credentials / unverified email; the screen shows the message.
    const { data } = await authApi.login(payload);

    const nextSession: AuthResponse = { user: data.payload, token: data.token };

    await clearReactQueryCache();
    await setAsyncStorageItem(AUTH_SESSION_STORAGE_KEY, nextSession);
    setAccessToken(nextSession.token);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setSession(null);
    await Promise.all([
      setAsyncStorageItem(AUTH_SESSION_STORAGE_KEY, null),
      clearReactQueryCache(),
    ]);
  }, []);

  // Restore the saved session on app start. The saved access token may be
  // expired (it lasts 1 minute); apiClient refreshes it on the first 401.
  useEffect(() => {
    let isMounted = true;
    void getAsyncStorageItem<AuthResponse>(AUTH_SESSION_STORAGE_KEY)
      .then((saved) => {
        if (isMounted && saved?.token) {
          setAccessToken(saved.token);
          setSession(saved);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsInitializing(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Let apiClient tell us when it refreshed the token or the session died.
  useEffect(() => {
    setAuthHandlers({
      onTokenRefreshed: (token) => {
        const current = sessionRef.current;
        if (!current) return;
        const next = { ...current, token };
        sessionRef.current = next;
        setSession(next);
        void setAsyncStorageItem(AUTH_SESSION_STORAGE_KEY, next);
      },
      onSessionExpired: () => {
        void logout();
      },
    });

    return () => setAuthHandlers({});
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      isInitializing,
      login,
      logout,
    }),
    [session, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
