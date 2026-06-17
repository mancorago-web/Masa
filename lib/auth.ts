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
  togo: ["ventas"],
};

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

export async function login(id: string, password: string): Promise<AppUser | null> {
  try {
    const db = getDb();
    if (!db) return null;
    const doc = await db.collection(USERS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    const user = doc.data() as StoredUser;
    if (!user.active) return null;
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) {
      // Try the other hash method (for cross-browser compatibility)
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
    const session: AppUser = { id: user.id, name: user.name, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (e) {
    console.error("Login error:", e);
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
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
    const snap = await db.collection(USERS_COLLECTION).limit(1).get();
    if (!snap.empty) return false;
    const hash = await hashPassword("admin");
    await db.collection(USERS_COLLECTION).doc("admin").set({
      id: "admin",
      name: "Administrador",
      role: "admin",
      active: true,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    });
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
