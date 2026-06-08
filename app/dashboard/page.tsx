"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

interface InventoryItem {
  id: string;
  category: string;
  name: string;
  currentStock: number;
  unit: string;
  minStock: number;
  unitCost?: number;
}

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  cost: number;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface PaymentData {
  id: string;
  tableId: number;
  items: OrderItem[];
  subtotal: number;
  tip: number;
  method: 'efectivo' | 'yape' | 'pos';
  amountPaid?: number;
  change?: number;
  date: string;
  deleted?: boolean;
}

interface SoldItem {
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
}

interface DailyTotals {
  revenue: number;
  tips: number;
  itemsSold: number;
  totalCost: number;
  totalMargin: number;
  paymentBreakdown: { efectivo: number; yape: number; pos: number };
}

interface DailySnapshot {
  date: string;
  totals: DailyTotals;
  soldItems: SoldItem[];
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parsePaymentDate(dateStr: string) {
  try {
    const parts = dateStr.split(',')[0].trim().split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  } catch {}
  return '';
}

const formatCurrency = (n: number) => `S/${n.toFixed(2)}`;
const SNAPSHOT_PREFIX = 'masa-dashboard-daily-';

function computeSoldItems(
  payments: PaymentData[],
  recipes: { id: string; category: string; name: string }[],
  subRecipes: { id: string; parentId: string; name: string }[],
  recipeIngredients: Record<string, RecipeIngredient[]>,
  subIngredients: Record<string, RecipeIngredient[]>,
  inventory: InventoryItem[],
): SoldItem[] {
  const items: SoldItem[] = [];
  const map = new Map<string, { qty: number; revenue: number }>();

  for (const p of payments) {
    for (const item of p.items) {
      const existing = map.get(item.name);
      if (existing) {
        existing.qty += item.quantity;
        existing.revenue += item.quantity * item.unitPrice;
      } else {
        map.set(item.name, { qty: item.quantity, revenue: item.quantity * item.unitPrice });
      }
    }
  }

  const invCost = new Map<string, number>();
  for (const inv of inventory) {
    if (inv.unitCost) invCost.set(inv.name.toLowerCase(), inv.unitCost);
  }

  const sumCost = (ings: RecipeIngredient[]) =>
    ings.reduce((s, ing) => s + (ing.cost || ing.quantity * (invCost.get(ing.name.toLowerCase()) || 0)), 0);

  const recipeByName = new Map<string, string>();
  for (const r of recipes) recipeByName.set(r.name.toLowerCase(), r.id);

  const subRecipeByName = new Map<string, string>();
  for (const sr of subRecipes) subRecipeByName.set(sr.name.toLowerCase(), sr.id);

  for (const [name, data] of map.entries()) {
    let cost = 0;
    const nameLower = name.toLowerCase();

    const subId = subRecipeByName.get(nameLower);
    if (subId && subIngredients[subId]) {
      cost = sumCost(subIngredients[subId]) * data.qty;
    } else {
      const recipeId = recipeByName.get(nameLower);
      if (recipeId && recipeIngredients[recipeId]) {
        cost = sumCost(recipeIngredients[recipeId]) * data.qty;
      } else {
        const avgPrice = data.qty > 0 ? data.revenue / data.qty : 0;
        cost = avgPrice * 0.3 * data.qty;
      }
    }

    const margin = data.revenue > 0 ? ((data.revenue - cost) / data.revenue) * 100 : 0;
    items.push({ name, qty: data.qty, revenue: data.revenue, cost, margin });
  }

  items.sort((a, b) => b.revenue - a.revenue);
  return items;
}

function computeTotals(payments: PaymentData[], soldItems: SoldItem[]): DailyTotals {
  const revenue = payments.reduce((s, p) => s + p.subtotal, 0);
  const tips = payments.reduce((s, p) => s + p.tip, 0);
  const itemsSold = soldItems.reduce((s, i) => s + i.qty, 0);
  const totalCost = soldItems.reduce((s, i) => s + i.cost, 0);
  const totalMargin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;
  const paymentBreakdown = { efectivo: 0, yape: 0, pos: 0 };
  for (const p of payments) {
    paymentBreakdown[p.method] += p.subtotal;
  }
  return { revenue, tips, itemsSold, totalCost, totalMargin, paymentBreakdown };
}

export default function Dashboard() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [recipes, setRecipes] = useState<{ id: string; category: string; name: string }[]>([]);
  const [subRecipes, setSubRecipes] = useState<{ id: string; parentId: string; name: string }[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<Record<string, RecipeIngredient[]>>({});
  const [subIngredients, setSubIngredients] = useState<Record<string, RecipeIngredient[]>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [snapshotData, setSnapshotData] = useState<DailySnapshot | null>(null);
  const lastSavedDate = useRef('');

  const isToday = selectedDate === todayStr();

  // Load all data on mount
  useEffect(() => {
    const today = todayStr();
    setSelectedDate(today);
    lastSavedDate.current = today;
    setPayments(loadFromStorage<PaymentData[]>('masa-ventas-payments', []));
    setRecipes(loadFromStorage<{ id: string; category: string; name: string }[]>('masa-recipes', []));
    setSubRecipes(loadFromStorage<{ id: string; parentId: string; name: string }[]>('masa-subRecipes', []));
    setRecipeIngredients(loadFromStorage<Record<string, RecipeIngredient[]>>('masa-recipeIngredients', {}));
    setSubIngredients(loadFromStorage<Record<string, RecipeIngredient[]>>('masa-subIngredients', {}));
    setInventory(loadFromStorage<InventoryItem[]>('masa-inventory', []));
    setLoading(false);
  }, []);

  // When selectedDate changes to a non-today date, try loading snapshot
  useEffect(() => {
    if (!selectedDate || isToday) {
      setSnapshotData(null);
      return;
    }
    const saved = loadFromStorage<DailySnapshot | null>(SNAPSHOT_PREFIX + selectedDate, null);
    setSnapshotData(saved);
  }, [selectedDate, isToday]);

  // Auto-save snapshot every 30s and on midnight
  useEffect(() => {
    if (loading) return;

    const saveSnapshot = () => {
      const today = todayStr();
      if (lastSavedDate.current !== today) {
        lastSavedDate.current = today;
      }
      // Only save today's snapshot using current computed data
      const p = payments.filter(p => !p.deleted && parsePaymentDate(p.date) === today);
      if (p.length === 0) return;
      const computedSold = computeSoldItems(p, recipes, subRecipes, recipeIngredients, subIngredients, inventory);
      const computedTotals = computeTotals(p, computedSold);
      const snapshot: DailySnapshot = {
        date: today,
        totals: computedTotals,
        soldItems: computedSold,
      };
      saveToStorage(SNAPSHOT_PREFIX + today, snapshot);
    };

    // Save immediately on mount
    const timer = setTimeout(saveSnapshot, 2000);

    const interval = setInterval(saveSnapshot, 30000);

    // Midnight check
    const msToMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };

    let midnightTimer = setTimeout(function tick() {
      saveSnapshot();
      lastSavedDate.current = todayStr();
      midnightTimer = setTimeout(tick, msToMidnight());
    }, msToMidnight());

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      clearTimeout(midnightTimer);
    };
  }, [loading, payments, recipes, subRecipes, recipeIngredients, subIngredients, inventory]);

  const filteredPayments = useMemo(() => {
    if (!selectedDate) return [];
    if (isToday) return payments.filter(p => !p.deleted && parsePaymentDate(p.date) === selectedDate);
    // For past dates, return empty — we use snapshot
    return [];
  }, [payments, selectedDate, isToday]);

  const soldItems = useMemo(() => {
    if (!isToday && snapshotData) return snapshotData.soldItems;
    if (!isToday) return [];
    return computeSoldItems(filteredPayments, recipes, subRecipes, recipeIngredients, subIngredients, inventory);
  }, [filteredPayments, recipes, subRecipes, recipeIngredients, subIngredients, inventory, isToday, snapshotData]);

  const totals = useMemo(() => {
    if (!isToday && snapshotData) return snapshotData.totals;
    return computeTotals(filteredPayments, soldItems);
  }, [filteredPayments, soldItems, isToday, snapshotData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-2 md:p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/menu" className="text-blue-600 hover:underline text-sm md:text-base">
            ← Volver al menú
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">📊 Dashboard</h1>
          <div className="w-24" />
        </div>

        {/* Date selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Ingresos</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.revenue)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Propinas</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totals.tips)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Items Vend.</p>
            <p className="text-2xl font-bold text-gray-800">{totals.itemsSold}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Margen</p>
            <p className={`text-2xl font-bold ${totals.totalMargin >= 40 ? 'text-green-700' : totals.totalMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
              {totals.totalMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Payment Method Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="font-bold text-gray-800 mb-3">Métodos de Pago</h2>
            {filteredPayments.length === 0 ? (
              <p className="text-gray-400 text-sm">Sin ventas en esta fecha.</p>
            ) : (
              <div className="space-y-2">
                {([
                  { label: 'Efectivo', key: 'efectivo' as const, color: 'bg-green-500' },
                  { label: 'Yape', key: 'yape' as const, color: 'bg-blue-500' },
                  { label: 'POS/Tarjeta', key: 'pos' as const, color: 'bg-purple-500' },
                ]).map(m => {
                  const amount = totals.paymentBreakdown[m.key];
                  const pct = totals.revenue > 0 ? (amount / totals.revenue) * 100 : 0;
                  return (
                    <div key={m.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{m.label}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${m.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cost vs Revenue */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="font-bold text-gray-800 mb-3">Ganancias</h2>
            {filteredPayments.length === 0 ? (
              <p className="text-gray-400 text-sm">Sin ventas en esta fecha.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ingresos</span>
                  <span className="font-bold text-green-700">{formatCurrency(totals.revenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Costo de ventas</span>
                  <span className="font-bold text-red-600">{formatCurrency(totals.totalCost)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-800">Ganancia neta</span>
                  <span className="font-bold text-green-700">{formatCurrency(totals.revenue - totals.totalCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Margen</span>
                  <span className={`font-bold ${totals.totalMargin >= 40 ? 'text-green-700' : totals.totalMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {totals.totalMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{ width: `${Math.min(totals.totalMargin, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items sold detail */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="font-bold text-gray-800 mb-3">Detalle de Productos Vendidos</h2>
          {soldItems.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin productos vendidos en esta fecha.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Producto</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Ingreso</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Costo</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Ganancia</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {soldItems.map(item => {
                    const profit = item.revenue - item.cost;
                    const marginColor = item.margin >= 50 ? 'text-green-700' : item.margin >= 25 ? 'text-yellow-600' : 'text-red-600';
                    return (
                      <tr key={item.name} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800">{item.name}</td>
                        <td className="px-3 py-2 text-center">{item.qty}</td>
                        <td className="px-3 py-2 text-right text-green-700">{formatCurrency(item.revenue)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatCurrency(item.cost)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(profit)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${marginColor}`}>{item.margin.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td className="px-3 py-2 text-gray-800">TOTAL</td>
                    <td className="px-3 py-2 text-center">{totals.itemsSold}</td>
                    <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.revenue)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatCurrency(totals.totalCost)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totals.revenue - totals.totalCost)}</td>
                    <td className={`px-3 py-2 text-right ${totals.totalMargin >= 40 ? 'text-green-700' : totals.totalMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {totals.totalMargin.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
