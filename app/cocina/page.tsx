"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    // Second chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.6);
  } catch {}
}

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
  orderNumber: number;
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

const DELIVERY_NUMBER = 10;
const TOGO_NUMBER = 11;
const tableName = (n: number) =>
  n === DELIVERY_NUMBER ? 'DELIVERY' :
  n === TOGO_NUMBER ? 'TO GO' :
  `Mesa ${n}`;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mi}:${ss}`;
}

function isSameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

function tablesFromData(data: Record<string, unknown>): TableOrder[] | null {
  // New format: per-table fields (table_0 ... table_10)
  const fields: TableOrder[] = [];
  let allFieldsExist = true;
  for (let i = 0; i < 11; i++) {
    const t = data[`table_${i}`] as TableOrder | undefined;
    if (!t) { allFieldsExist = false; break; }
    fields.push(t);
  }
  if (allFieldsExist) return fields;
  // Fallback: old format with single tables array
  if (Array.isArray(data.tables)) return data.tables as TableOrder[];
  return null;
}

function isItemFromToday(itemId: string): boolean {
  const ts = parseInt(itemId, 10);
  if (isNaN(ts)) return true;
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
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // Load + listeners
  useEffect(() => {
    const db = getDb();
    if (!db) return;

    let firestoreLoaded = false;
    let disposed = false;

    function processVentasTables(curTables: TableOrder[], prev: KitchenTable[]): KitchenTable[] {
      const updated = prev.map((t) => ({ ...t, items: [...t.items] }));
      const now = localNow();

      const existingByTable = new Map<number, Set<string>>();
      for (const kt of updated) {
        const s = existingByTable.get(kt.tableNumber) ?? new Set();
        for (const ki of kt.items) s.add(ki.id);
        existingByTable.set(kt.tableNumber, s);
      }

      const notifs: string[] = [];
      let hasNew = false;
      let orderCounter = prev.filter(t => isSameDay(t.updatedAt, todayStr())).length;

      for (let i = 0; i < curTables.length; i++) {
        if (curTables[i].status !== "ocupado") continue;
        const tableNum = i + 1;
        const existingIds = existingByTable.get(tableNum) ?? new Set();

        const newItems: KitchenItem[] = [];
        for (const item of curTables[i].items) {
          if (!existingIds.has(item.id) && !archivedItemIdsRef.current.has(item.id) && isItemFromToday(item.id)) {
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
        orderCounter++;

        updated.push({
          id: `${tableNum}-${orderCounter}-${Date.now()}`,
          tableNumber: tableNum,
          orderNumber: orderCounter,
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

    // 1. Load tables from Firestore first
    db.collection("config").doc("cocinaTables").get().then((snap: any) => {
      if (disposed) return;
      if (snap.exists) {
        const data = snap.data();
        if (data?.tables) {
          tablesLastSavedRef.current = JSON.stringify(data.tables);
          setTables(data.tables);
        }
      }
      firestoreLoaded = true;
      initialLoadDoneRef.current = true;

      // 2. Now do the Ventas initial load (picks up items not yet in Firestore tables)
      db.collection("config").doc("ventas").get().then((ventasSnap: any) => {
        if (disposed || !ventasSnap.exists) return;
        const data = ventasSnap.data();
        const curTables = tablesFromData(data);
        if (!curTables) return;
        const curStr = JSON.stringify(curTables);
        if (curStr === prevTablesRef.current) return;
        prevTablesRef.current = curStr;
        setTables((prev) => processVentasTables(curTables, prev));
      }).catch(() => {});
    }).catch(() => { firestoreLoaded = true; });

    // 3. Listen for new orders from Ventas
    const unsubVentas = db
      .collection("config")
      .doc("ventas")
      .onSnapshot((snap: any) => {
        if (!firestoreLoaded || !snap.exists) return;
        const data = snap.data();
        const curTables = tablesFromData(data);
        if (!curTables) return;

        const currentStr = JSON.stringify(curTables);
        if (currentStr === prevTablesRef.current) return;
        prevTablesRef.current = currentStr;

        try {
          setTables((prev) => processVentasTables(curTables, prev));
        } catch {}
      });

    // 4. Listen for cross-device table sync
    const unsubTables = db
      .collection("config")
      .doc("cocinaTables")
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (!data?.tables) return;
        const str = JSON.stringify(data.tables);
        if (str === tablesLastSavedRef.current) return;
        tablesLastSavedRef.current = str;
        setTables(prev => {
          if (prev.length === 0) return data.tables;
          // Build set of ALL item IDs already present in incoming data
          const incomingItemIds = new Set<string>();
          for (const t of data.tables) {
            for (const it of t.items) incomingItemIds.add(it.id);
          }
          const merged = data.tables.slice();
          let changed = false;
          for (const t of prev) {
            // Only add if at least one item isn't already in incoming data
            const hasNewItem = t.items.some(it => !incomingItemIds.has(it.id));
            if (hasNewItem) {
              merged.push(t);
              changed = true;
            }
          }
          return changed ? merged : data.tables;
        });
      });

    // 5. Fallback: periodically check for new items in Ventas (catches missed snapshots)
    const fallbackInterval = setInterval(async () => {
      if (!firestoreLoaded) return;
      try {
        const snap = await db.collection("config").doc("ventas").get();
        if (!snap.exists) return;
        const data = snap.data();
        const curTables = tablesFromData(data);
        if (!curTables) return;
        const curStr = JSON.stringify(curTables);
        if (curStr === prevTablesRef.current) return;
        prevTablesRef.current = curStr;
        setTables((prev) => processVentasTables(curTables, prev));
      } catch {}
    }, 4000);

    return () => {
      disposed = true;
      unsubVentas();
      unsubTables();
      clearInterval(fallbackInterval);
    };
  }, []);

  // 6. Save tables to Firestore on every change (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const tablesLastSavedRef = useRef("");
  useEffect(() => {
    if (!initialLoadDoneRef.current && tables.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const db = getDb();
      if (!db) return;
      const str = JSON.stringify(tables);
      tablesLastSavedRef.current = str;
      db.collection("config").doc("cocinaTables").set({ tables }, { merge: true }).catch(() => {});
    }, 300);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
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

  // Populate archivedItemIdsRef from history on load (prevents re-adding archived items after refresh)
  useEffect(() => {
    const ids = new Set<string>();
    for (const tables of Object.values(historyFromFirestore)) {
      for (const t of tables) {
        for (const item of t.items) ids.add(item.id);
      }
    }
    if (ids.size > 0) archivedItemIdsRef.current = ids;
  }, [historyFromFirestore]);

  // Archive completed tables to history for persistence; only remove past-day tables from active view
  const archivedItemIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (tables.length === 0) return;
    const today = todayStr();
    const byDate: Record<string, KitchenTable[]> = {};
    const remaining: KitchenTable[] = [];
    let hasNewArchive = false;
    for (const t of tables) {
      const id = t.id ?? `${t.tableNumber}-${t.orderNumber}`;
      if (t.items.every(i => i.completed) && !archivedItemIdsRef.current.has(id)) {
        const d = t.updatedAt.slice(0, 10);
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(t);
        for (const it of t.items) archivedItemIdsRef.current.add(it.id);
        hasNewArchive = true;
        // Keep today's completed tables visible; remove past-day ones
        if (d === today) remaining.push(t);
      } else {
        remaining.push(t);
      }
    }
    if (!hasNewArchive) return;
    const db = getDb();
    if (!db) { archivedItemIdsRef.current = new Set(); return; }
    for (const [date, dateTables] of Object.entries(byDate)) {
      db.collection('config').doc('cocinaHistory').set({ [date]: dateTables }, { merge: true })
        .catch(() => {});
    }
    setTables(remaining);
  }, [tables]);

  // Load history
  const historyTables = useMemo(() => {
    if (!historyDate) return [];
    // Merge archived data + tables still in active view (covers all dates)
    const archived = historyFromFirestore[historyDate] ?? [];
    const todayFromTables = tables.filter(t => isSameDay(t.updatedAt, historyDate));
    const archivedIds = new Set(archived.map(t => t.id ?? `${t.tableNumber}-${t.orderNumber}`));
    const merged = [...archived, ...todayFromTables.filter(t => !archivedIds.has(t.id ?? `${t.tableNumber}-${t.orderNumber}`))];
    return merged;
  }, [historyDate, historyFromFirestore, tables]);

  const toggleItem = (tableId: string, itemId: string) => {
    setTables((prev) =>
      prev.map((t) => {
        const tid = t.id ?? `${t.tableNumber}-${t.orderNumber}`;
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

  // Auto-collapse tables when they become fully completed
  const prevAllDoneRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentAllDone = new Set<string>();
    for (const t of tables) {
      const id = t.id ?? `${t.tableNumber}-${t.orderNumber}`;
      if (t.items.every(i => i.completed)) {
        currentAllDone.add(id);
      }
    }
    setCollapsedIds(prev => {
      const next = new Set(prev);
      for (const id of currentAllDone) {
        if (!prevAllDoneRef.current.has(id)) {
          next.add(id);
        }
      }
      prevAllDoneRef.current = currentAllDone;
      return next;
    });
  }, [tables]);

  // Play sound when new notification arrives
  const prevNotifLengthRef = useRef(0);
  useEffect(() => {
    if (notifications.length > prevNotifLengthRef.current) {
      playNewOrderSound();
    }
    prevNotifLengthRef.current = notifications.length;
  }, [notifications]);

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

  // Only show today's orders on main screen
  const todayTables = tables.filter(t => isSameDay(t.updatedAt, todayStr()));

  // Sort: pending first, then completed, collapsed to bottom
  const sorted = [...todayTables].sort((a, b) => {
    const aCollapsed = collapsedIds.has(a.id);
    const bCollapsed = collapsedIds.has(b.id);
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
              const isCollapsed = collapsedIds.has(table.id);
              return (
                <div
                  key={table.id}
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
                    onClick={() => isCollapsed ? toggleCollapse(table.id) : undefined}
                    className={`flex items-center justify-between cursor-pointer ${
                      isCollapsed ? "p-3" : "p-4 pb-0"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <h2 className={`font-bold ${isCollapsed ? "text-base" : "text-xl"}`}>
                        {tableName(table.tableNumber)}
                        <span className="font-normal text-gray-500 ml-2">
                          Pedido #{table.orderNumber}
                        </span>
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
                      <ul className="space-y-2">
                        {table.items.map((item) => (
                          <li key={item.id}>
                            <button
                              onClick={() => toggleItem(table.id, item.id)}
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
                      key={table.id ?? `${table.tableNumber}-${table.orderNumber}`}
                      className={`rounded-lg border p-3 ${
                        table.items.every((i) => i.completed)
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold">
                          {tableName(table.tableNumber)}
                          <span className="font-normal text-gray-500 ml-1">
                            Pedido #{table.orderNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {table.items[0]?.createdByName && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                              {table.items[0].createdByName}
                            </span>
                          )}
                          <span>{new Date(table.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
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
