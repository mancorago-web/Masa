import { getDb } from "./firebase";

export type UserRole = "admin" | "manager" | "waiter" | "kitchen" | "togo";

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
}

interface StoredUser extends AppUser {
  passwordHash: string;
  active: boolean;
  createdAt: string;
  createdBy?: string;
}

const USERS_COLLECTION = "appUsers";
const SESSION_KEY = "masa-current-user";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gerente",
  waiter: "Mesero",
  kitchen: "Cocina",
  togo: "Mesero 2",
};

const PAGE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["inventario", "caja", "ventas", "dashboard", "facturas", "planillas", "usuarios"],
  manager: ["inventario", "caja", "ventas", "dashboard", "facturas", "planillas"],
  waiter: ["ventas", "facturas"],
  kitchen: ["inventario", "cocina", "caja"],
  togo: ["ventas", "facturas"],
};

const FIREBASE_API_KEY = "AIzaSyD0s9ZYjr_ZRJLkv7LZt-9KhOAvGsl-WoY";

function getAuth() {
  // @ts-ignore
  const firebase = globalThis.firebase;
  if (!firebase || !firebase.auth) return null;
  const app = firebase.apps.length > 0 ? firebase.apps[0] : null;
  if (!app) return null;
  return app.auth();
}

function fbPassword(password: string): string {
  return password.length < 6 ? password + 'x'.repeat(6 - password.length) : password;
}

async function createFirebaseUser(id: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `${id}@masa.app`,
          password: fbPassword(password),
          returnSecureToken: true,
        }),
      }
    );
    const data = await res.json();
    return !data.error || data.error.message === "EMAIL_EXISTS";
  } catch {
    return false;
  }
}

export { createFirebaseUser };

export async function hashPassword(password: string): Promise<string> {
  // Fallback if crypto.subtle is not available (e.g. insecure context)
  if (typeof crypto === "undefined" || !crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return "fallback_" + Math.abs(hash).toString(16);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function waitForSdk(maxMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const check = () => {
      // @ts-ignore
      if (globalThis.firebase && globalThis.firebase.auth) resolve(true);
    };
    check();
    const start = Date.now();
    const interval = setInterval(() => {
      check();
      if (Date.now() - start > maxMs) { clearInterval(interval); resolve(false); }
    }, 200);
  });
}

export async function login(id: string, password: string): Promise<AppUser | null> {
  // Ensure Firebase SDK is loaded and app initialized
  await waitForSdk(5000);
  // @ts-ignore
  const firebase = globalThis.firebase;
  if (firebase && firebase.auth && firebase.apps.length === 0) {
    firebase.initializeApp({
      apiKey: "AIzaSyD0s9ZYjr_ZRJLkv7LZt-9KhOAvGsl-WoY",
      authDomain: "masa-9ec4d.firebaseapp.com",
      projectId: "masa-9ec4d",
      storageBucket: "masa-9ec4d.firebasestorage.app",
      messagingSenderId: "353087520263",
      appId: "1:353087520263:web:904fe978ce28673715b4a2",
      measurementId: "G-4EYL82XD7X",
    });
  }
  // Try Firebase Auth first
  const auth = getAuth();
  if (auth) {
    try {
      await auth.signInWithEmailAndPassword(`${id}@masa.app`, fbPassword(password));
      const db = getDb();
      if (db) {
        const doc = await db.collection(USERS_COLLECTION).doc(id).get();
        if (doc.exists) {
          const user = doc.data() as StoredUser;
          if (!user.active) return null;
          const session: AppUser = { id: user.id, name: user.name, role: user.role };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          return session;
        }
      }
    } catch {}
  }

  // Fall back to old custom auth
  const db = getDb();
  if (!db) return null;
  const doc = await db.collection(USERS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const user = doc.data() as StoredUser;
  if (!user.active) return null;
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      if (sha256 !== user.passwordHash) return null;
    } else {
      return null;
    }
  }

  // Old auth succeeded — create Firebase Auth account for future logins
  await createFirebaseUser(id, password).catch(() => {});

  const session: AppUser = { id: user.id, name: user.name, role: user.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  try {
    // @ts-ignore
    const firebase = globalThis.firebase;
    if (firebase && firebase.auth && firebase.apps.length > 0) {
      firebase.apps[0].auth().signOut();
    }
  } catch {}
}

export function getCurrentUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function hasAccess(user: AppUser | null, page: string): boolean {
  if (!user) return false;
  return PAGE_PERMISSIONS[user.role]?.includes(page) ?? false;
}

export async function ensureDefaultAdmin(): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    // Try to read existing users — if it fails (security rules), assume admin exists
    let exists = false;
    try {
      const snap = await db.collection(USERS_COLLECTION).limit(1).get();
      exists = !snap.empty;
    } catch {
      return false; // Can't read, admin presumably exists
    }
    if (exists) return false;
    const password = "admin";
    const hash = await hashPassword(password);
    await db.collection(USERS_COLLECTION).doc("admin").set({
      id: "admin",
      name: "Administrador",
      role: "admin",
      active: true,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    });
    // Also create Firebase Auth account
    await createFirebaseUser("admin", password).catch(() => {});
    return true;
  } catch (e) {
    console.error("Error creating default admin:", e);
    return false;
  }
}

export async function createUser(
  id: string,
  name: string,
  password: string,
  role: UserRole,
  createdBy?: string
): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const hash = await hashPassword(password);
    await db.collection(USERS_COLLECTION).doc(id).set({
      id,
      name,
      role,
      active: true,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      createdBy,
    });
    // Also create Firebase Auth account
    await createFirebaseUser(id, password).catch(() => {});
    return true;
  } catch (e) {
    console.error("Error creating user:", e);
    return false;
  }
}

export async function updateUserPassword(id: string, newPassword: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const hash = await hashPassword(newPassword);
    await db.collection(USERS_COLLECTION).doc(id).update({ passwordHash: hash });
    return true;
  } catch (e) {
    console.error("Error updating password:", e);
    return false;
  }
}

export async function updateUserRole(id: string, role: UserRole): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    await db.collection(USERS_COLLECTION).doc(id).update({ role });
    return true;
  } catch (e) {
    console.error("Error updating role:", e);
    return false;
  }
}

export async function toggleUserActive(id: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const doc = await db.collection(USERS_COLLECTION).doc(id).get();
    if (!doc.exists) return false;
    const current = doc.data() as StoredUser;
    await db.collection(USERS_COLLECTION).doc(id).update({ active: !current.active });
    return true;
  } catch (e) {
    console.error("Error toggling user:", e);
    return false;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    await db.collection(USERS_COLLECTION).doc(id).delete();
    return true;
  } catch (e) {
    console.error("Error deleting user:", e);
    return false;
  }
}

export async function getAllUsers(): Promise<StoredUser[]> {
  try {
    const db = getDb();
    if (!db) return [];
    const snap = await db.collection(USERS_COLLECTION).get();
    return snap.docs.map((d: any) => d.data() as StoredUser);
  } catch (e) {
    console.error("Error getting users:", e);
    return [];
  }
}
