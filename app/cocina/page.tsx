"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

interface KitchenItem {
  name: string;
  quantity: number;
}

interface KitchenRecord {
  id: string;
  tableNumber: number;
  items: KitchenItem[];
  receivedAt: string;
  completedAt: string | null;
  status: "pending" | "completed";
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface TableOrder {
  items: OrderItem[];
  status: "libre" | "ocupado";
  customerName: string;
}

const HISTORY_KEY = "masa-kitchen-history";
const COCINA_FIRESTORE_DOC = "config";
const COCINA_FIRESTORE_FIELD = "cocina";

function loadHistory(): KitchenRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveHistoryToStorage(records: KitchenRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

async function syncHistoryToFirestore(history: KitchenRecord[]) {
  const db = getDb();
  if (!db) return;
  try {
    await db
      .collection(COCINA_FIRESTORE_DOC)
      .doc(COCINA_FIRESTORE_FIELD)
      .set({ history }, { merge: true });
  } catch (e) {
    console.error("Firestore sync error (cocina):", e);
  }
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

export default function Cocina() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<KitchenRecord[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; text: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState(todayStr());
  const prevTablesRef = useRef<string>("");
  const firstLoad = useRef(true);
  const notifId = useRef(0);
  const historyRef = useRef<KitchenRecord[]>([]);

  // Keep ref in sync
  historyRef.current = history;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // Load existing history on mount + listen for new orders from Ventas
  useEffect(() => {
    const cached = loadHistory();
    if (cached.length > 0) {
      setHistory(cached);
    }

    const db = getDb();
    if (!db) return;

    // Listen for kitchen history changes from other devices
    const unsubHistory = db
      .collection(COCINA_FIRESTORE_DOC)
      .doc(COCINA_FIRESTORE_FIELD)
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (data.history && Array.isArray(data.history)) {
          setHistory((prev) => {
            if (data.history.length < prev.length) return prev;
            const incoming = JSON.stringify(data.history);
            const current = JSON.stringify(prev);
            if (incoming === current) return prev;
            // Merge: keep local updates (completion status) but accept new records
            const localMap = new Map(prev.map((r) => [r.id, r]));
            let changed = false;
            const merged = data.history.map((r: KitchenRecord) => {
              const local = localMap.get(r.id);
              if (local && local.status === "completed" && r.status === "pending") {
                changed = true;
                return local;
              }
              return r;
            });
            return changed ? merged : data.history;
          });
        }
      });

    // Listen for new orders from Ventas tables
    const unsubVentas = db
      .collection("config")
      .doc("ventas")
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (!data.tables || !Array.isArray(data.tables)) return;

        const currentStr = JSON.stringify(data.tables);
        if (currentStr === prevTablesRef.current) return;
        const prevStr = prevTablesRef.current;
        prevTablesRef.current = currentStr;

        if (firstLoad.current) {
          firstLoad.current = false;
          return;
        }

        if (!prevStr) return;

        try {
          const prevTables: TableOrder[] = JSON.parse(prevStr);
          const curTables: TableOrder[] = data.tables;
          const newRecords: KitchenRecord[] = [];
          const now = new Date().toISOString();

          for (let i = 0; i < curTables.length; i++) {
            const prevTotal = prevTables[i]?.items.reduce((s, it) => s + it.quantity, 0) || 0;
            const curTotal = curTables[i].items.reduce((s, it) => s + it.quantity, 0);
            if (curTotal > prevTotal && curTables[i].status === "ocupado") {
              const newItems: KitchenItem[] = [];
              for (const cur of curTables[i].items) {
                const prev = prevTables[i]?.items.find((p) => p.id === cur.id);
                if (!prev) {
                  newItems.push({ name: cur.name, quantity: cur.quantity });
                } else if (cur.quantity > prev.quantity) {
                  newItems.push({
                    name: cur.name,
                    quantity: cur.quantity - prev.quantity,
                  });
                }
              }
              if (newItems.length > 0) {
                const record: KitchenRecord = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  tableNumber: i + 1,
                  items: newItems,
                  receivedAt: now,
                  completedAt: null,
                  status: "pending",
                };
                newRecords.push(record);

                // Show notification
                const id = ++notifId.current;
                const desc = newItems.map((it) => `${it.name} x${it.quantity}`).join(", ");
                setNotifications((n) => [
                  { id, text: `Mesa ${i + 1}: ${desc}` },
                  ...n.slice(0, 4),
                ]);
                setTimeout(() => {
                  setNotifications((n) => n.filter((x) => x.id !== id));
                }, 5000);
              }
            }
          }

          if (newRecords.length > 0) {
            setHistory((prev) => {
              const updated = [...newRecords, ...prev];
              saveHistoryToStorage(updated);
              syncHistoryToFirestore(updated);
              return updated;
            });
          }
        } catch {}
      });

    return () => {
      unsubHistory();
      unsubVentas();
    };
  }, []);

  // Auto-save history on change (for completion toggles)
  useEffect(() => {
    if (history.length > 0) {
      saveHistoryToStorage(history);
      syncHistoryToFirestore(history);
    }
  }, [history]);

  const markCompleted = (recordId: string) => {
    setHistory((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, status: "completed" as const, completedAt: new Date().toISOString() }
          : r
      )
    );
  };

  const reopenOrder = (recordId: string) => {
    setHistory((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, status: "pending" as const, completedAt: null } : r
      )
    );
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  if (!user) return null;

  if (user.role !== "kitchen") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <p className="text-gray-500">Acceso restringido. Solo personal de cocina.</p>
      </main>
    );
  }

  const todayRecords = history.filter((r) => isSameDay(r.receivedAt, todayStr()));
  const pending = todayRecords.filter((r) => r.status === "pending");
  const completed = todayRecords.filter((r) => r.status === "completed");

  const filteredForHistory = showHistory
    ? history.filter((r) => isSameDay(r.receivedAt, historyDate))
    : [];

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/menu" className="text-white hover:text-gray-300">
            ← Menú
          </Link>
          <h1 className="text-lg font-bold">Cocina</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">
            {pending.length} pendientes
          </span>
          <button
            onClick={() => setShowHistory(true)}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Historial
          </button>
        </div>
      </header>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-16 right-4 z-50 space-y-2 max-w-xs">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-lg shadow-lg animate-pulse"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-yellow-800">🆕 Nuevo Pedido</p>
                  <p className="text-sm text-yellow-900 mt-1">{n.text}</p>
                </div>
                <button
                  onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                  className="text-yellow-600 hover:text-yellow-800 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's Orders */}
      <div className="container mx-auto p-4">
        {todayRecords.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🍕</p>
            <p className="text-gray-400 text-lg">No hay pedidos hoy</p>
          </div>
        ) : (
          <>
            {/* Pending orders */}
            {pending.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Pendientes ({pending.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pending.map((record) => (
                    <div key={record.id} className="bg-white rounded-xl shadow-md p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold">Mesa {record.tableNumber}</h3>
                        <span className="text-xs text-gray-400">
                          {new Date(record.receivedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <ul className="space-y-2 mb-3">
                        {record.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="bg-gray-50 px-3 py-2 rounded-lg flex justify-between"
                          >
                            <span className="font-medium">{item.name}</span>
                            <span className="font-bold">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => markCompleted(record.id)}
                        className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700"
                      >
                        Marcar Listo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed orders */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Completados ({completed.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {completed.map((record) => (
                    <div
                      key={record.id}
                      className="bg-green-50 border border-green-300 rounded-xl shadow-md p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-green-800">
                          Mesa {record.tableNumber}
                        </h3>
                        <span className="text-xs text-green-600">
                          {new Date(record.receivedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <ul className="space-y-2 mb-3">
                        {record.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="bg-green-100 px-3 py-2 rounded-lg flex justify-between text-green-700"
                          >
                            <span>{item.name}</span>
                            <span className="font-bold">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-center text-green-600 text-sm font-semibold mb-2">
                        ✅ Listo{" "}
                        {record.completedAt &&
                          new Date(record.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </p>
                      <button
                        onClick={() => reopenOrder(record.id)}
                        className="w-full border border-green-400 text-green-700 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-100"
                      >
                        Reabrir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-10">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Historial de Cocina</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Filtrar por fecha
              </label>
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="border rounded px-3 py-2 w-full max-w-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredForHistory.length === 0 ? (
                <p className="text-center text-gray-400 py-10">
                  No hay pedidos para esta fecha
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredForHistory.map((record) => (
                    <div
                      key={record.id}
                      className={`rounded-lg border p-3 ${
                        record.status === "completed"
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">
                          Mesa {record.tableNumber}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(record.receivedAt).toLocaleString([], {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {record.items.map((item, idx) => (
                          <span
                            key={idx}
                            className={`text-sm px-2 py-0.5 rounded ${
                              record.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.name} x{item.quantity}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {record.status === "completed"
                          ? `Completado ${new Date(record.completedAt!).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "Pendiente"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
