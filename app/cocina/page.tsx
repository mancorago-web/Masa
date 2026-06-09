"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

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

export default function Cocina() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tables, setTables] = useState<TableOrder[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; text: string }[]>([]);
  const [readyItems, setReadyItems] = useState<Set<string>>(new Set());
  const prevRef = useRef<string>("");
  const firstLoad = useRef(true);
  const notifId = useRef(0);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const db = getDb();
    if (!db) return;
    const unsub = db
      .collection("config")
      .doc("ventas")
      .onSnapshot((snap: any) => {
        if (!snap.exists) return;
        const data = snap.data();
        if (!data.tables || !Array.isArray(data.tables)) return;

        const currentStr = JSON.stringify(data.tables);
        if (currentStr === prevRef.current) return;
        const prevStr = prevRef.current;
        prevRef.current = currentStr;

        setTables((prev) => {
          const incoming: TableOrder[] = data.tables;

          // Skip notification on first load
          if (firstLoad.current) {
            firstLoad.current = false;
            return incoming;
          }

          if (!prevStr) return incoming;

          try {
            const prevTables: TableOrder[] = JSON.parse(prevStr);
            for (let i = 0; i < incoming.length; i++) {
              const prevTotal = prevTables[i]?.items.reduce((s, it) => s + it.quantity, 0) || 0;
              const curTotal = incoming[i].items.reduce((s, it) => s + it.quantity, 0);
              if (curTotal > prevTotal && incoming[i].status === "ocupado") {
                // Find which items are new or increased
                const newOnes: string[] = [];
                for (const cur of incoming[i].items) {
                  const prev = prevTables[i]?.items.find((p) => p.id === cur.id);
                  if (!prev) {
                    newOnes.push(`${cur.name} x${cur.quantity}`);
                  } else if (cur.quantity > prev.quantity) {
                    newOnes.push(`${cur.name} +${cur.quantity - prev.quantity}`);
                  }
                }
                if (newOnes.length > 0) {
                  const id = ++notifId.current;
                  setNotifications((n) => [
                    { id, text: `Mesa ${i + 1}: ${newOnes.join(", ")}` },
                    ...n.slice(0, 4),
                  ]);
                  setTimeout(() => {
                    setNotifications((n) => n.filter((x) => x.id !== id));
                  }, 5000);
                }
              }
            }
          } catch {}

          return incoming;
        });
      });
    return () => unsub();
  }, []);

  const toggleReady = (itemId: string) => {
    setReadyItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
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

  const occupiedTables = tables
    .map((t, i) => ({ ...t, tableNumber: i + 1 }))
    .filter((t) => t.status === "ocupado" && t.items.length > 0);

  const totalPending = occupiedTables.reduce(
    (sum, t) => sum + t.items.filter((i) => !readyItems.has(i.id)).reduce((s, it) => s + it.quantity, 0),
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
        <span className="text-sm bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">
          {totalPending} pendientes
        </span>
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

      {/* Content */}
      <div className="container mx-auto p-4">
        {occupiedTables.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🍕</p>
            <p className="text-gray-400 text-lg">No hay pedidos pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {occupiedTables.map((table) => {
              const tableReady = table.items.every((i) => readyItems.has(i.id));
              return (
                <div
                  key={table.tableNumber}
                  className={`rounded-xl shadow-md p-4 ${
                    tableReady ? "bg-green-50 border border-green-300" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">Mesa {table.tableNumber}</h2>
                    {table.customerName && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {table.customerName}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {table.items.map((item) => {
                      const isReady = readyItems.has(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => toggleReady(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                              isReady
                                ? "bg-green-200 text-green-800 line-through"
                                : "bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <span className="font-medium">{item.name}</span>
                            <span className="text-lg font-bold ml-2">x{item.quantity}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {tableReady && (
                    <p className="text-center text-green-600 text-sm font-semibold mt-3">
                      ✅ Completado
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
