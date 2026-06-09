"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

interface Invoice {
  id: string;
  createdAt: string;
  date: string;
  customerName: string;
  rucDni: string;
  businessName: string;
  whatsapp: string;
  amount: number;
  status: "pending" | "issued" | "cancelled";
  deleted?: boolean;
}

const STORAGE_KEY = "masa-facturas";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

async function syncToFirestore(data: Record<string, unknown>) {
  const db = getDb();
  if (!db) return;
  try {
    await db.collection("config").doc("facturas").set(data, { merge: true });
  } catch (e) {
    console.error("Firestore sync error:", e);
  }
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const emptyForm = {
  customerName: "",
  rucDni: "",
  businessName: "",
  whatsapp: "",
  amount: 0,
};

export default function Facturas() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>(
    () => loadFromStorage<Invoice[]>(STORAGE_KEY, [])
  );
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  if (authLoading) return <main className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Cargando...</p></main>;
  if (!user) return null;

  // Load from Firestore on mount + real-time listener
  useEffect(() => {
    const cached = loadFromStorage<Invoice[]>(STORAGE_KEY, []);
    if (cached.length > 0) setInvoices(cached);

    const db = getDb();
    if (!db) return;
    const unsub = db
      .collection("config")
      .doc("facturas")
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (data.invoices && Array.isArray(data.invoices)) {
          setInvoices((prev) => {
            if (data.invoices.length < prev.length) return prev;
            const incoming = JSON.stringify(data.invoices);
            const current = JSON.stringify(prev);
            return incoming === current ? prev : data.invoices;
          });
        }
      });
    return () => unsub();
  }, []);

  // Auto-save to localStorage + Firestore
  useEffect(() => {
    saveToStorage(STORAGE_KEY, invoices);
    syncToFirestore({ invoices });
  }, [invoices]);

  const addInvoice = useCallback(() => {
    if (!form.customerName.trim() || !form.rucDni.trim()) return;
    const invoice: Invoice = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      date: todayStr(),
      customerName: form.customerName.trim(),
      rucDni: form.rucDni.trim(),
      businessName: form.businessName.trim(),
      whatsapp: form.whatsapp.trim(),
      amount: form.amount || 0,
      status: "pending",
    };
    setInvoices((prev) => [invoice, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
  }, [form]);

  const toggleStatus = useCallback((id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const next: Record<string, "pending" | "issued" | "cancelled"> = {
          pending: "issued",
          issued: "cancelled",
          cancelled: "pending",
        };
        return { ...inv, status: next[inv.status] };
      })
    );
  }, []);

  const toggleDeleted = useCallback((id: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, deleted: !inv.deleted } : inv
      )
    );
  }, []);

  const filtered = invoices.filter(
    (inv) => inv.date === filterDate && !inv.deleted
  );
  const deletedOnDate = invoices.filter(
    (inv) => inv.date === filterDate && inv.deleted
  );

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <Link
          href="/menu"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Volver al menú
        </Link>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Facturas</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Nueva Factura
          </button>
        </div>

        {/* Date filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filtrar por fecha
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-xs"
          />
        </div>

        {/* Invoice list */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">RUC/DNI</th>
                  <th className="text-left px-4 py-3">Razón Social</th>
                  <th className="text-left px-4 py-3">WhatsApp</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-center px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-gray-400 py-8"
                    >
                      No hay facturas para esta fecha
                    </td>
                  </tr>
                )}
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {inv.customerName}
                    </td>
                    <td className="px-4 py-3">{inv.rucDni}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {inv.businessName || "—"}
                    </td>
                    <td className="px-4 py-3">{inv.whatsapp || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      S/ {inv.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold cursor-pointer ${
                          inv.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : inv.status === "issued"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                        onClick={() => toggleStatus(inv.id)}
                        title="Cambiar estado"
                      >
                        {inv.status === "pending"
                          ? "Pendiente"
                          : inv.status === "issued"
                          ? "Emitida"
                          : "Anulada"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleDeleted(inv.id)}
                        className="text-red-500 hover:text-red-700 text-lg"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {deletedOnDate.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={7}
                        className="px-4 py-2 text-xs text-gray-400 font-medium"
                      >
                        Eliminadas ({deletedOnDate.length})
                      </td>
                    </tr>
                    {deletedOnDate.map((inv) => (
                      <tr
                        key={inv.id}
                        className="opacity-50 line-through"
                      >
                        <td className="px-4 py-2">{inv.customerName}</td>
                        <td className="px-4 py-2">{inv.rucDni}</td>
                        <td className="px-4 py-2 text-gray-400">
                          {inv.businessName || "—"}
                        </td>
                        <td className="px-4 py-2">{inv.whatsapp || "—"}</td>
                        <td className="px-4 py-2 text-right">
                          S/ {inv.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-xs text-gray-400">
                            {inv.status === "pending"
                              ? "Pendiente"
                              : inv.status === "issued"
                              ? "Emitida"
                              : "Anulada"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => toggleDeleted(inv.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Restaurar"
                          >
                            ↺
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Invoice Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold mb-4">Nueva Factura</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) =>
                      setForm({ ...form, customerName: e.target.value })
                    }
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    RUC / DNI *
                  </label>
                  <input
                    type="text"
                    value={form.rucDni}
                    onChange={(e) =>
                      setForm({ ...form, rucDni: e.target.value })
                    }
                    className="border rounded px-3 py-2 w-full"
                    placeholder="12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) =>
                      setForm({ ...form, businessName: e.target.value })
                    }
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Razón social (opcional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={form.whatsapp}
                    onChange={(e) =>
                      setForm({ ...form, whatsapp: e.target.value })
                    }
                    className="border rounded px-3 py-2 w-full"
                    placeholder="+51 999 999 999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Monto (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount || ""}
                    onChange={(e) =>
                      setForm({ ...form, amount: Number(e.target.value) || 0 })
                    }
                    className="border rounded px-3 py-2 w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setForm(emptyForm);
                    setShowForm(false);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={addInvoice}
                  disabled={!form.customerName.trim() || !form.rucDni.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
