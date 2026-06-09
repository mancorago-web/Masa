"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { AppUser, getCurrentUser, logout as authLogout, ensureDefaultAdmin } from "@/lib/auth";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  loginUser: (user: AppUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await ensureDefaultAdmin();
      } catch (e) {
        console.error("Auth init error:", e);
      }
      if (cancelled) return;
      const session = getCurrentUser();
      if (session) setUser(session);
      setLoading(false);
    };
    init();
    // Safety timeout: force loading=false after 5s no matter what
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const loginUser = useCallback((u: AppUser) => {
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
