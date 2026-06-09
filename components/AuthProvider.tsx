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
    const init = async () => {
      await ensureDefaultAdmin();
      const session = getCurrentUser();
      if (session) setUser(session);
      setLoading(false);
    };
    init();
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
