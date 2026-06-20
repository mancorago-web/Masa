"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { AppUser, getCurrentUser, logout as authLogout, ensureDefaultAdmin } from "@/lib/auth";

function getAuth() {
  // @ts-ignore
  const firebase = globalThis.firebase;
  if (!firebase || !firebase.auth) return null;
  const app = firebase.apps.length > 0 ? firebase.apps[0] : null;
  if (!app) return null;
  return app.auth();
}

function ensureFirebaseApp() {
  // @ts-ignore
  const firebase = globalThis.firebase;
  if (!firebase) return null;
  if (firebase.apps.length > 0) return firebase.apps[0];
  return firebase.initializeApp({
    apiKey: "AIzaSyD0s9ZYjr_ZRJLkv7LZt-9KhOAvGsl-WoY",
    authDomain: "masa-9ec4d.firebaseapp.com",
    projectId: "masa-9ec4d",
    storageBucket: "masa-9ec4d.firebasestorage.app",
    messagingSenderId: "353087520263",
    appId: "1:353087520263:web:904fe978ce28673715b4a2",
    measurementId: "G-4EYL82XD7X",
  });
}

function waitForFirebaseSdk(maxMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const check = () => {
      // @ts-ignore
      if (globalThis.firebase && globalThis.firebase.auth) {
        resolve(true);
      }
    };
    check();
    const start = Date.now();
    const interval = setInterval(() => {
      check();
      if (Date.now() - start > maxMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 200);
  });
}

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
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Wait for Firebase Auth SDK to load and initialize the app
      const sdkReady = await waitForFirebaseSdk(5000);
      if (cancelled) return;

      if (sdkReady) {
        // Initialize Firebase app now so getAuth() works
        ensureFirebaseApp();
        const auth = getAuth();
        if (auth) {
          const hasFirebaseSession = await new Promise<boolean>((resolve) => {
            const unsub = auth.onAuthStateChanged((fbUser: any) => {
              unsub();
              resolve(!!fbUser);
            });
            setTimeout(() => {
              unsub();
              resolve(false);
            }, 4000);
          });
          if (cancelled) return;
          if (!hasFirebaseSession) {
            authLogout();
            setUser(null);
            setLoading(false);
            return;
          }
        }
      }
      setUser(session);
      setLoading(false);
    };
    init();
    // Safety timeout: force loading=false after 10s no matter what (longer due to Firebase SDK loading)
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
    }, 10000);
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
