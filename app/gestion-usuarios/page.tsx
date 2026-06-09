"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  UserRole, ROLE_LABELS,
  getAllUsers, createUser, updateUserRole, updateUserPassword, toggleUserActive,
} from "@/lib/auth";

interface UserDoc {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

const emptyForm = { name: "", password: "", role: "waiter" as UserRole };

export default function GestionUsuarios() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && user?.role === "admin") loadUsers();
  }, [loading, user]);

  const loadUsers = async () => {
    const all = await getAllUsers();
    setUsers(all);
  };

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.password.trim() || !editId?.trim()) return;
    const ok = await createUser(editId.trim(), form.name.trim(), form.password, form.role, user?.id);
    if (ok) {
      showMsg(`Usuario ${editId} creado`);
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      loadUsers();
    } else {
      showMsg("Error al crear usuario");
    }
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    if (uid === "admin") return;
    await updateUserRole(uid, role);
    loadUsers();
  };

  const handleToggleActive = async (uid: string) => {
    if (uid === "admin") return;
    await toggleUserActive(uid);
    loadUsers();
  };

  const handlePasswordChange = async (uid: string) => {
    if (!editPassword.trim() || editPassword.length < 4) return;
    const ok = await updateUserPassword(uid, editPassword);
    if (ok) showMsg("Contraseña actualizada");
    setEditPassword("");
    loadUsers();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <p className="text-gray-500">Acceso restringido. Solo administradores.</p>
      </main>
    );
  }

  const roles: UserRole[] = ["admin", "manager", "waiter", "kitchen"];

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <Link href="/menu" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Volver al menú
        </Link>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditId("");
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Nuevo Usuario
          </button>
        </div>

        {msg && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded mb-4 text-sm">
            {msg}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Rol</th>
                  <th className="text-center px-4 py-3">Activo</th>
                  <th className="text-left px-4 py-3">Contraseña</th>
                  <th className="text-center px-4 py-3">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className={!u.active ? "opacity-50" : ""}>
                    <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={u.id === "admin"}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        disabled={u.id === "admin"}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          u.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        } disabled:opacity-50`}
                      >
                        {u.active ? "Sí" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <input
                          type="password"
                          placeholder="Nueva contraseña"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="border rounded px-2 py-1 text-xs w-28"
                        />
                        <button
                          onClick={() => handlePasswordChange(u.id)}
                          disabled={!editPassword.trim() || editPassword.length < 4}
                          className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300 disabled:opacity-50"
                        >
                          Cambiar
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New User Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold mb-4">
                {editId ? "Editar Usuario" : "Nuevo Usuario"}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID de usuario *</label>
                  <input
                    type="text"
                    value={editId ?? ""}
                    onChange={(e) => setEditId(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                    placeholder="ej: juan.perez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contraseña *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Mínimo 4 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="border rounded px-3 py-2 w-full"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!editId?.trim() || !form.name.trim() || !form.password.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
