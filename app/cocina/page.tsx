"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

interface KitchenItem {
  id: string;
  name: string;
  quantity: number;
  completed: boolean;
  createdByName?: string;
}

interface KitchenTable {
  id: string;
  tableNumber: number;
  round: number;
  items: KitchenItem[];
  updatedAt: string;
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

const STORAGE_KEY = "masa-kitchen-tables";
const FIRESTORE_DOC = "config";
const FIRESTORE_FIELD = "cocina";
const DELIVERY_NUMBER = 10;
const TOGO_NUMBER = 11;
const tableName = (n: number) =>
  n === DELIVERY_NUMBER ? 'DELIVERY' :
  n === TOGO_NUMBER ? 'TO GO' :
  `Mesa ${n}`;

function loadTables(): KitchenTable[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveTablesToStorage(tables: KitchenTable[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
}

async function syncToFirestore(tables: KitchenTable[]) {
  const db = getDb();
  if (!db) return;
  try {
    await db
      .collection(FIRESTORE_DOC)
      .doc(FIRESTORE_FIELD)
      .set({ tables }, { merge: true });
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

function isItemFromToday(itemId: string): boolean {
  const ts = parseInt(itemId, 10);
  if (isNaN(ts)) return true; // if id is not a timestamp, process it
  const d = new Date(ts);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
}

export default function Cocina() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tables, setTables] = useState<KitchenTable[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; text: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState('');
  const [historyFromFirestore, setHistoryFromFirestore] = useState<Record<string, KitchenTable[]>>({});
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const prevTablesRef = useRef<string>("");
  const notifId = useRef(0);
  const tablesRef = useRef<KitchenTable[]>([]);
  tablesRef.current = tables;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // Load + listeners
  useEffect(() => {
    const cached = loadTables().filter(t => isSameDay(t.updatedAt, todayStr()));
    if (cached.length > 0) setTables(cached);

    const db = getDb();
    if (!db) return;

    // Listen for kitchen table changes from other devices
    const unsubKitchen = db
      .collection(FIRESTORE_DOC)
      .doc(FIRESTORE_FIELD)
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (!data.tables || !Array.isArray(data.tables)) return;
            setTables((prev) => {
              if (data.tables.length < prev.length) return prev;
              const incoming = JSON.stringify(data.tables);
              const current = JSON.stringify(prev);
              if (incoming === current) return prev;
              // Merge: prefer remote (Firestore is source of truth), keep new local-only items
              const prevMap = new Map(prev.map((t) => [t.id ?? `${t.tableNumber}-1`, t]));
              const merged = data.tables.map((t: KitchenTable) => {
                const key = t.id ?? `${t.tableNumber}-1`;
                const local = prevMap.get(key);
                if (!local) return { ...t, round: t.round ?? 1, id: t.id ?? `${t.tableNumber}-${t.round ?? 1}` };
                const remoteItems = new Map(t.items.map((i) => [i.id, i]));
                // Keep local items not in remote (e.g., toggling loading state), but prefer remote for overlapping
                const mergedItems = local.items.map((item) => remoteItems.get(item.id) ?? item);
                return { ...t, items: mergedItems };
              });
              return merged;
            });
      });

    function processVentasTables(curTables: TableOrder[], prev: KitchenTable[]): KitchenTable[] {
      const updated = prev.map((t) => ({ ...t, items: [...t.items] }));
      const now = new Date().toISOString();

      // Build a map: tableNum → existing item IDs
      const existingByTable = new Map<number, Set<string>>();
      for (const kt of updated) {
        const s = existingByTable.get(kt.tableNumber) ?? new Set();
        for (const ki of kt.items) s.add(ki.id);
        existingByTable.set(kt.tableNumber, s);
      }

      const notifs: string[] = [];
      let hasNew = false;

      for (let i = 0; i < curTables.length; i++) {
        if (curTables[i].status !== "ocupado") continue;
        const tableNum = i + 1;
        const existingIds = existingByTable.get(tableNum) ?? new Set();

        const newItems: KitchenItem[] = [];
        for (const item of curTables[i].items) {
          if (!existingIds.has(item.id) && isItemFromToday(item.id)) {
            existingIds.add(item.id);
            newItems.push({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              completed: false,
              createdByName: (item as any).createdByName,
            });
          }
        }

        if (newItems.length === 0) continue;
        hasNew = true;

        // Always create a new round (separate card) for each batch of new items
        const existingRounds = updated.filter((kt) => kt.tableNumber === tableNum).map((kt) => kt.round || 1);
        const newRound = existingRounds.length > 0 ? Math.max(...existingRounds) + 1 : 1;
        updated.push({
          id: `${tableNum}-${newRound}-${Date.now()}`,
          tableNumber: tableNum,
          round: newRound,
          items: newItems,
          updatedAt: now,
        });

        const creator = newItems[0]?.createdByName ? ` (${newItems[0].createdByName})` : "";
        notifs.push(
          `${tableName(tableNum)}${creator}: ${newItems.map((it) => `${it.name} x${it.quantity}`).join(", ")}`
        );
      }

      if (hasNew) {
        for (const text of notifs) {
          const id = ++notifId.current;
          setNotifications((n) => [{ id, text }, ...n.slice(0, 4)]);
          setTimeout(() => { setNotifications((n) => n.filter((x) => x.id !== id)); }, 5000);
        }
      }

      return hasNew ? updated : prev;
    }

    // Listen for new orders from Ventas
    const unsubVentas = db
      .collection("config")
      .doc("ventas")
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (!data.tables || !Array.isArray(data.tables)) return;

        const currentStr = JSON.stringify(data.tables);
        if (currentStr === prevTablesRef.current) return;
        prevTablesRef.current = currentStr;

        try {
          const curTables: TableOrder[] = data.tables;
          setTables((prev) => processVentasTables(curTables, prev));
        } catch {}
      });

    // Fallback: periodically check for new items in Ventas (catches missed snapshots)
    const fallbackInterval = setInterval(async () => {
      try {
        const snap = await db.collection("config").doc("ventas").get();
        if (!snap.exists) return;
        const data = snap.data();
        if (!data.tables || !Array.isArray(data.tables)) return;
        const curStr = JSON.stringify(data.tables);
        if (curStr === prevTablesRef.current) return;
        prevTablesRef.current = curStr;
        const curTables: TableOrder[] = data.tables;
        setTables((prev) => processVentasTables(curTables, prev));
      } catch {}
    }, 4000);

    return () => {
      unsubKitchen();
      unsubVentas();
      clearInterval(fallbackInterval);
    };
  }, []);

  // Auto-save on change (skip first render to avoid overwrite)
  const firstSyncRef = useRef(true);
  useEffect(() => {
    if (firstSyncRef.current) { firstSyncRef.current = false; return; }
    if (tables.length > 0) {
      saveTablesToStorage(tables);
      syncToFirestore(tables);
    }
  }, [tables]);

  // Real-time listener for Firestore history (tables archived from past days)
  useEffect(() => {
    const db = getDb();
    if (!db) return;
    const unsub = db.collection('config').doc('cocinaHistory')
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (data) setHistoryFromFirestore(data as Record<string, KitchenTable[]>);
      });
    return () => unsub();
  }, []);

  // Archive completed tables from previous days into Firestore history
  // (runs only when tables change and we detect past-date tables)
  const lastArchiveDate = useRef('');
  useEffect(() => {
    if (firstSyncRef.current) return;
    const today = todayStr();
    if (lastArchiveDate.current === today) return;
    const pastTables = tables.filter(t => !isSameDay(t.updatedAt, today) && t.items.every(i => i.completed));
    if (pastTables.length === 0) return;
    lastArchiveDate.current = today;
    const byDate: Record<string, KitchenTable[]> = {};
    for (const t of pastTables) {
      const d = t.updatedAt.slice(0, 10);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t);
    }
    const db = getDb();
    if (!db) return;
    for (const [date, dateTables] of Object.entries(byDate)) {
      db.collection('config').doc('cocinaHistory').set({ [date]: dateTables }, { merge: true })
        .catch(() => {});
    }
  }, [tables]);

  // Load history: for dates before today, check Firestore history first,
  // then fall back to filtering the live tables array
  const historyTables = useMemo(() => {
    if (!historyDate) return [];
    const today = todayStr();
    if (historyDate !== today) {
      // For past dates, check Firestore history first
      const archived = historyFromFirestore[historyDate];
      if (archived) return archived;
    }
    // Fall back to filtering live tables by date
    return tables.filter(t => isSameDay(t.updatedAt, historyDate));
  }, [historyDate, historyFromFirestore, tables]);

  const toggleItem = (tableId: string, itemId: string) => {
    setTables((prev) =>
      prev.map((t) => {
        const tid = t.id ?? `${t.tableNumber}-${t.round ?? 1}`;
        if (tid !== tableId) return t;
        return {
          ...t,
          items: t.items.map((item) =>
            item.id === itemId
              ? { ...item, completed: !item.completed }
              : item
          ),
        };
      })
    );
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Auto-collapse tables when they become fully completed (but don't override manual expand)
  const prevAllDoneRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentAllDone = new Set<string>();
    for (const t of tables) {
      const id = t.id ?? `${t.tableNumber}-${t.round ?? 1}`;
      if (t.items.every(i => i.completed)) {
        currentAllDone.add(id);
      }
    }
    setCollapsedIds(prev => {
      const next = new Set(prev);
      // Only auto-collapse newly completed tables (not already tracked)
      for (const id of currentAllDone) {
        if (!prevAllDoneRef.current.has(id)) {
          next.add(id);
        }
      }
      prevAllDoneRef.current = currentAllDone;
      return next;
    });
  }, [tables]);

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

  // Only show today's orders on main screen; past orders go to historial
  const todayTables = tables.filter(t => {
    const d = new Date(t.updatedAt);
    const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return isSameDay(localDate, todayStr());
  });

  // Sort tables: pending first, then completed, collapsed to bottom
  const sorted = [...todayTables].sort((a, b) => {
    const aId = a.id ?? `${a.tableNumber}-${a.round ?? 1}`;
    const bId = b.id ?? `${b.tableNumber}-${b.round ?? 1}`;
    const aCollapsed = collapsedIds.has(aId);
    const bCollapsed = collapsedIds.has(bId);
    const aAllDone = a.items.every((i) => i.completed);
    const bAllDone = b.items.every((i) => i.completed);
    if (aCollapsed && !bCollapsed) return 1;
    if (!aCollapsed && bCollapsed) return -1;
    if (aAllDone && !bAllDone) return 1;
    if (!aAllDone && bAllDone) return -1;
    return 0;
  });

  const pendingCount = todayTables.reduce(
    (sum, t) => sum + t.items.filter((i) => !i.completed).reduce((s, it) => s + it.quantity, 0),
    0
  );

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
            {pendingCount} pendientes
          </span>
          <button
            onClick={() => {
              setHistoryDate(todayStr());
              setShowHistory(true);
            }}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Historial
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            title="Forzar recarga de pedidos"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-16 right-4 z-50 space-y-2 max-w-sm">
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
                  onClick={() =>
                    setNotifications((prev) => prev.filter((x) => x.id !== n.id))
                  }
                  className="text-yellow-600 hover:text-yellow-800 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tables Grid */}
      <div className="container mx-auto p-4">
        {todayTables.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🍕</p>
            <p className="text-gray-400 text-lg">No hay pedidos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((table) => {
              const allDone = table.items.every((i) => i.completed);
              const tableId = table.id ?? `${table.tableNumber}-${table.round ?? 1}`;
              const isCollapsed = collapsedIds.has(tableId);
              return (
                <div
                  key={tableId}
                  className={`rounded-xl shadow-md transition-colors ${
                    isCollapsed
                      ? "bg-green-50 border border-green-300"
                      : allDone
                      ? "bg-green-50 border border-green-300"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {/* Clickable header */}
                  <div
                    onClick={() => isCollapsed ? toggleCollapse(tableId) : undefined}
                    className={`flex items-center justify-between cursor-pointer ${
                      isCollapsed ? "p-3" : "p-4 pb-0"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <h2 className={`font-bold ${isCollapsed ? "text-base" : "text-xl"}`}>
                        {tableName(table.tableNumber)}
                        {table.round && table.round > 1 && (
                          <span className={`font-normal text-gray-500 ml-2 ${isCollapsed ? "text-sm" : "text-base"}`}>
                            Pedido {table.round}
                          </span>
                        )}
                      </h2>
                      {!isCollapsed && table.items[0]?.createdByName && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {table.items[0].createdByName}
                        </span>
                      )}
                      {isCollapsed && (
                        <span className="text-green-600 text-sm font-semibold">✅ Listo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(table.updatedAt).toLocaleDateString([], {
                          day: "2-digit", month: "2-digit"
                        })} {new Date(table.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-gray-400 text-xs">{isCollapsed ? '▼' : '▲'}</span>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {!isCollapsed && (
                    <div className="p-4">
                      {/* Items */}
                      <ul className="space-y-2">
                        {table.items.map((item) => (
                          <li key={item.id}>
                            <button
                              onClick={() => toggleItem(tableId, item.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all ${
                                item.completed
                                  ? "bg-green-200 text-green-800"
                                  : "bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
                              }`}
                            >
                              <span
                                className={`font-medium ${
                                  item.completed ? "line-through" : ""
                                }`}
                              >
                                {item.name}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-lg font-bold">x{item.quantity}</span>
                                <span
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                                    item.completed
                                      ? "bg-green-600 border-green-600 text-white"
                                      : "border-gray-400"
                                  }`}
                                >
                                  {item.completed ? "✓" : ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* Table status */}
                      {allDone ? (
                        <p className="text-center text-green-600 text-sm font-semibold mt-3">
                          {table.tableNumber === DELIVERY_NUMBER ? "✅ Delivery listo" : table.tableNumber === TOGO_NUMBER ? "✅ To Go listo" : "✅ Mesa completa"}
                        </p>
                      ) : (
                        <p className="text-center text-gray-400 text-xs mt-3">
                          Toca cada plato al terminarlo
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
              {historyTables.length === 0 ? (
                <p className="text-center text-gray-400 py-10">
                  No hay pedidos para esta fecha
                </p>
              ) : (
                <div className="space-y-3">
                  {historyTables.map((table) => (
                    <div
                      key={table.id ?? `${table.tableNumber}-${table.round ?? 1}`}
                      className={`rounded-lg border p-3 ${
                        table.items.every((i) => i.completed)
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="font-bold mb-2">
                        {tableName(table.tableNumber)}
                        {table.round && table.round > 1 && (
                          <span className="font-normal text-gray-500 ml-1">
                            Pedido {table.round}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {table.items.map((item) => (
                          <span
                            key={item.id}
                            className={`text-sm px-2 py-0.5 rounded ${
                              item.completed
                                ? "bg-green-100 text-green-700 line-through"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.name} x{item.quantity}
                          </span>
                        ))}
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
