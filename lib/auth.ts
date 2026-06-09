import { getDb } from "./firebase";

export type UserRole = "admin" | "manager" | "waiter" | "kitchen";

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
};

const PAGE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["inventario", "caja", "ventas", "dashboard", "facturas", "planillas", "usuarios"],
  manager: ["inventario", "caja", "ventas", "dashboard", "facturas", "planillas"],
  waiter: ["caja", "ventas", "facturas"],
  kitchen: ["inventario", "ventas"],
};

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function login(id: string, password: string): Promise<AppUser | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const doc = await db.collection(USERS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    const user = doc.data() as StoredUser;
    if (!user.active) return null;
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) return null;
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
  const db = getDb();
  if (!db) return false;
  try {
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
  const db = getDb();
  if (!db) return false;
  try {
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
  const db = getDb();
  if (!db) return false;
  try {
    const hash = await hashPassword(newPassword);
    await db.collection(USERS_COLLECTION).doc(id).update({ passwordHash: hash });
    return true;
  } catch (e) {
    console.error("Error updating password:", e);
    return false;
  }
}

export async function updateUserRole(id: string, role: UserRole): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await db.collection(USERS_COLLECTION).doc(id).update({ role });
    return true;
  } catch (e) {
    console.error("Error updating role:", e);
    return false;
  }
}

export async function toggleUserActive(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
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
  const db = getDb();
  if (!db) return false;
  try {
    await db.collection(USERS_COLLECTION).doc(id).delete();
    return true;
  } catch (e) {
    console.error("Error deleting user:", e);
    return false;
  }
}

export async function getAllUsers(): Promise<StoredUser[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db.collection(USERS_COLLECTION).get();
    return snap.docs.map((d: any) => d.data() as StoredUser);
  } catch (e) {
    console.error("Error getting users:", e);
    return [];
  }
}
