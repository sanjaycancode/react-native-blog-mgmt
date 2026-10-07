import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { getAsyncStorageItem, setAsyncStorageItem } from "@/utils/asyncStorage";

import { clearReactQueryCache } from "@/lib/react-query/queryClient";
import type { AuthResponse, LoginPayload } from "@/types";

interface AuthContextValue {
  session: AuthResponse | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_SESSION_STORAGE_KEY = "auth_session";

// Minimal stub: persists session to AsyncStorage, no network calls.
// Swap `fakeAuthenticate` for a real API call when backend exists.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession: AuthResponse = {
      user: { id: "demo-user", username: payload.username },
      token: "demo-token",
    };
    await clearReactQueryCache();
    await setAsyncStorageItem(AUTH_SESSION_STORAGE_KEY, nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    setSession(null);
    await Promise.all([
      setAsyncStorageItem(AUTH_SESSION_STORAGE_KEY, null),
      clearReactQueryCache(),
    ]);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    void getAsyncStorageItem<AuthResponse>(AUTH_SESSION_STORAGE_KEY)
      .then((saved) => {
        if (isMounted && saved?.token) setSession(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsInitializing(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
