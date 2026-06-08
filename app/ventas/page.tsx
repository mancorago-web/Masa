"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getDb } from "@/lib/firebase";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface TableOrder {
  items: OrderItem[];
  status: 'libre' | 'ocupado';
  customerName: string;
}

interface PaymentData {
  tableId: number;
  items: OrderItem[];
  subtotal: number;
  method: 'efectivo' | 'yape' | 'pos';
  amountPaid?: number;
  change?: number;
  date: string;
}

interface MenuItem {
  name: string;
  price: number;
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

const SALES_CATEGORIES = ['ENTRADAS', 'PIZZAS CLÁSICAS', 'PIZZAS VEGETARIANAS', 'PIZZAS ESPECIALES', 'PASTAS RELLENAS', 'PASTAS'];

const defaultRecipes: { id: string; category: string; name: string }[] = [
  { id: '20', category: 'ENTRADAS', name: 'Pan al ajo' },
  { id: '21', category: 'ENTRADAS', name: 'Bruschetta' },
  { id: '22', category: 'ENTRADAS', name: 'Crostini misti' },
  { id: '19', category: 'PIZZAS CLÁSICAS', name: 'Americana' },
  { id: '23', category: 'PIZZAS CLÁSICAS', name: 'Pepperoni' },
  { id: '24', category: 'PIZZAS CLÁSICAS', name: 'Hawaiana' },
  { id: '25', category: 'PIZZAS CLÁSICAS', name: 'Jamón y Champiñones' },
  { id: '6', category: 'PIZZAS VEGETARIANAS', name: 'Margherita' },
  { id: '7', category: 'PIZZAS VEGETARIANAS', name: 'Marinara' },
  { id: '26', category: 'PIZZAS VEGETARIANAS', name: 'Napoli' },
  { id: '27', category: 'PIZZAS VEGETARIANAS', name: 'Vegetariana' },
  { id: '28', category: 'PIZZAS VEGETARIANAS', name: 'Sorrentina' },
  { id: '29', category: 'PIZZAS VEGETARIANAS', name: 'Mediterranea' },
  { id: '8', category: 'PIZZAS ESPECIALES', name: 'BBQ Chicken' },
  { id: '30', category: 'PIZZAS ESPECIALES', name: 'Panorama' },
  { id: '31', category: 'PIZZAS ESPECIALES', name: 'Italiana' },
  { id: '32', category: 'PIZZAS ESPECIALES', name: '4 Quesos' },
  { id: '33', category: 'PIZZAS ESPECIALES', name: 'Rústica' },
  { id: '34', category: 'PIZZAS ESPECIALES', name: 'Huerta & Mar' },
  { id: '35', category: 'PIZZAS ESPECIALES', name: 'Buscaiola' },
  { id: '36', category: 'PIZZAS ESPECIALES', name: 'Capricciosa' },
  { id: '10', category: 'PASTAS RELLENAS', name: 'Ravioli Ricotta' },
  { id: '11', category: 'PASTAS RELLENAS', name: 'Agnolotti' },
  { id: '12', category: 'PASTAS', name: 'Spaghetti Carbonara' },
  { id: '13', category: 'PASTAS', name: 'Fettuccine Alfredo' },
];

const defaultSubRecipes: { id: string; parentId: string; name: string }[] = [
  { id: 's1', parentId: '6', name: 'Margherita 8 Pzas.' },
  { id: 's2', parentId: '6', name: 'Margherita 12 Pzas.' },
  { id: 's3', parentId: '6', name: 'Margherita 16 Pzas.' },
  { id: 's4', parentId: '7', name: 'Marinara 8 Pzas.' },
  { id: 's5', parentId: '7', name: 'Marinara 12 Pzas.' },
  { id: 's6', parentId: '7', name: 'Marinara 16 Pzas.' },
  { id: 's7', parentId: '19', name: 'Americana 8 Pzas.' },
  { id: 's8', parentId: '19', name: 'Americana 12 Pzas.' },
  { id: 's9', parentId: '19', name: 'Americana 16 Pzas.' },
  { id: 's10', parentId: '23', name: 'Pepperoni 8 Pzas.' },
  { id: 's11', parentId: '23', name: 'Pepperoni 12 Pzas.' },
  { id: 's12', parentId: '23', name: 'Pepperoni 16 Pzas.' },
  { id: 's13', parentId: '24', name: 'Hawaiana 8 Pzas.' },
  { id: 's14', parentId: '24', name: 'Hawaiana 12 Pzas.' },
  { id: 's15', parentId: '24', name: 'Hawaiana 16 Pzas.' },
  { id: 's16', parentId: '25', name: 'Jamón y Champiñones 8 Pzas.' },
  { id: 's17', parentId: '25', name: 'Jamón y Champiñones 12 Pzas.' },
  { id: 's18', parentId: '25', name: 'Jamón y Champiñones 16 Pzas.' },
  { id: 's19', parentId: '26', name: 'Napoli 8 Pzas.' },
  { id: 's20', parentId: '26', name: 'Napoli 12 Pzas.' },
  { id: 's21', parentId: '26', name: 'Napoli 16 Pzas.' },
  { id: 's22', parentId: '27', name: 'Vegetariana 8 Pzas.' },
  { id: 's23', parentId: '27', name: 'Vegetariana 12 Pzas.' },
  { id: 's24', parentId: '27', name: 'Vegetariana 16 Pzas.' },
  { id: 's25', parentId: '28', name: 'Sorrentina 8 Pzas.' },
  { id: 's26', parentId: '28', name: 'Sorrentina 12 Pzas.' },
  { id: 's27', parentId: '28', name: 'Sorrentina 16 Pzas.' },
  { id: 's28', parentId: '29', name: 'Mediterranea 8 Pzas.' },
  { id: 's29', parentId: '29', name: 'Mediterranea 12 Pzas.' },
  { id: 's30', parentId: '29', name: 'Mediterranea 16 Pzas.' },
  { id: 's31', parentId: '8', name: 'BBQ Chicken 8 Pzas.' },
  { id: 's32', parentId: '8', name: 'BBQ Chicken 12 Pzas.' },
  { id: 's33', parentId: '8', name: 'BBQ Chicken 16 Pzas.' },
  { id: 's34', parentId: '30', name: 'Panorama 8 Pzas.' },
  { id: 's35', parentId: '30', name: 'Panorama 12 Pzas.' },
  { id: 's36', parentId: '30', name: 'Panorama 16 Pzas.' },
  { id: 's37', parentId: '31', name: 'Italiana 8 Pzas.' },
  { id: 's38', parentId: '31', name: 'Italiana 12 Pzas.' },
  { id: 's39', parentId: '31', name: 'Italiana 16 Pzas.' },
  { id: 's40', parentId: '32', name: '4 Quesos 8 Pzas.' },
  { id: 's41', parentId: '32', name: '4 Quesos 12 Pzas.' },
  { id: 's42', parentId: '32', name: '4 Quesos 16 Pzas.' },
  { id: 's43', parentId: '33', name: 'Rústica 8 Pzas.' },
  { id: 's44', parentId: '33', name: 'Rústica 12 Pzas.' },
  { id: 's45', parentId: '33', name: 'Rústica 16 Pzas.' },
  { id: 's46', parentId: '34', name: 'Huerta & Mar 8 Pzas.' },
  { id: 's47', parentId: '34', name: 'Huerta & Mar 12 Pzas.' },
  { id: 's48', parentId: '34', name: 'Huerta & Mar 16 Pzas.' },
  { id: 's49', parentId: '35', name: 'Buscaiola 8 Pzas.' },
  { id: 's50', parentId: '35', name: 'Buscaiola 12 Pzas.' },
  { id: 's51', parentId: '35', name: 'Buscaiola 16 Pzas.' },
  { id: 's52', parentId: '36', name: 'Capricciosa 8 Pzas.' },
  { id: 's53', parentId: '36', name: 'Capricciosa 12 Pzas.' },
  { id: 's54', parentId: '36', name: 'Capricciosa 16 Pzas.' },
];

// Base prices per pizza for 8 Pzas.
const pizzaBasePrices: Record<string, number> = {
  'Margherita': 24, 'Marinara': 24, 'Napoli': 26, 'Vegetariana': 28, 'Sorrentina': 28, 'Mediterranea': 28,
  'Americana': 28, 'Pepperoni': 30, 'Hawaiana': 30, 'Jamón y Champiñones': 30,
  'BBQ Chicken': 32, 'Panorama': 32, 'Italiana': 32, '4 Quesos': 34, 'Rústica': 34,
  'Huerta & Mar': 34, 'Buscaiola': 34, 'Capricciosa': 34,
};

const sizePrices = (base: number) => ({ '8 Pzas.': base, '12 Pzas.': Math.round(base * 1.25), '16 Pzas.': Math.round(base * 1.5) });

const bebidasItems: MenuItem[] = [
  { name: 'Agua', price: 4 }, { name: 'Gaseosa', price: 6 }, { name: 'Cerveza', price: 10 }, { name: 'Vino tinto', price: 28 },
];

const nonPizzaPrices: Record<string, number> = {
  'Pan al ajo': 12, 'Bruschetta': 16, 'Crostini misti': 18,
  'Spaghetti Carbonara': 28, 'Fettuccine Alfredo': 28, 'Ravioli Ricotta': 32, 'Agnolotti': 32,
};

const initialTables: TableOrder[] = Array.from({ length: 8 }, () => ({
  items: [],
  status: 'libre',
  customerName: '',
}));

const STORAGE_KEY = 'masa-ventas-tables';
const PAYMENTS_KEY = 'masa-ventas-payments';

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return fallback;
}

async function syncToFirestore(data: Record<string, unknown>) {
  const db = getDb();
  if (!db) return;
  try {
    await db.collection('config').doc('ventas').set(data, { merge: true });
  } catch (e) {
    console.error('Firestore sync error:', e);
  }
}

function buildMenu(recipes: { id: string; category: string; name: string }[], subRecipes: { id: string; parentId: string; name: string }[]): MenuCategory[] {
  const categories: MenuCategory[] = [];
  const pizzaCatSet = new Set(['PIZZAS CLÁSICAS', 'PIZZAS VEGETARIANAS', 'PIZZAS ESPECIALES']);
  const seen = new Set<string>();

  for (const catName of SALES_CATEGORIES) {
    const catRecipes = recipes.filter(r => r.category === catName);
    if (catRecipes.length === 0) continue;
    const displayName = catName === 'PIZZAS CLÁSICAS' ? 'Pizzas Clásicas'
      : catName === 'PIZZAS VEGETARIANAS' ? 'Pizzas Vegetarianas'
      : catName === 'PIZZAS ESPECIALES' ? 'Pizzas Especiales'
      : catName === 'PASTAS RELLENAS' ? 'Pastas Rellenas'
      : catName.charAt(0) + catName.slice(1).toLowerCase();
    const items: MenuItem[] = [];

    if (pizzaCatSet.has(catName)) {
      for (const recipe of catRecipes) {
        const base = pizzaBasePrices[recipe.name];
        if (!base) continue;
        const sizes = sizePrices(base);
        const recipeSubs = subRecipes.filter(s => s.parentId === recipe.id);
        if (recipeSubs.length > 0) {
          for (const sub of recipeSubs) {
            const sizeName = sub.name.includes('8 Pzas.') ? '8 Pzas.' : sub.name.includes('12 Pzas.') ? '12 Pzas.' : sub.name.includes('16 Pzas.') ? '16 Pzas.' : '';
            const price = sizes[sizeName];
            if (price) { items.push({ name: sub.name, price }); seen.add(sub.name); }
          }
        } else {
          // No sub-recipes found — create default sizes
          for (const [sizeLabel, price] of Object.entries(sizes)) {
            const subName = `${recipe.name} ${sizeLabel}`;
            if (!seen.has(subName)) { items.push({ name: subName, price }); seen.add(subName); }
          }
        }
      }
    } else {
      for (const recipe of catRecipes) {
        const price = nonPizzaPrices[recipe.name];
        if (price && !seen.has(recipe.name)) { items.push({ name: recipe.name, price }); seen.add(recipe.name); }
      }
    }

    if (items.length > 0) categories.push({ name: displayName, items });
  }

  // Always add Bebidas
  categories.push({ name: 'Bebidas', items: bebidasItems });

  return categories;
}

export default function Ventas() {
  const [tables, setTables] = useState<TableOrder[]>(() => loadFromStorage(STORAGE_KEY, initialTables));
  const [activeTable, setActiveTable] = useState(0);
  const [showProductMenu, setShowProductMenu] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'yape' | 'pos' | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [paymentsHistory, setPaymentsHistory] = useState<PaymentData[]>(() => loadFromStorage(PAYMENTS_KEY, []));
  const [recipes, setRecipes] = useState(defaultRecipes);
  const [subRecipes, setSubRecipes] = useState(defaultSubRecipes);

  // Load recipes & sub-recipes from localStorage (shared with inventario)
  useEffect(() => {
    const savedRecipes = loadFromStorage<{ id: string; category: string; name: string }[] | null>('masa-recipes', null);
    if (savedRecipes && Array.isArray(savedRecipes)) {
      const savedById = new Map(savedRecipes.map(r => [r.id, r]));
      const merged = defaultRecipes.map(def => savedById.has(def.id) ? { ...savedById.get(def.id) } : def);
      const mergedIds = new Set(merged.map(r => r.id));
      for (const item of savedRecipes) {
        if (!mergedIds.has(item.id)) { merged.push(item); mergedIds.add(item.id); }
      }
      setRecipes(merged);
    }
    const savedSubs = loadFromStorage<{ id: string; parentId: string; name: string }[] | null>('masa-subRecipes', null);
    if (savedSubs && Array.isArray(savedSubs)) {
      setSubRecipes(savedSubs);
    }
  }, []);

  const productCategories = useMemo(() => buildMenu(recipes, subRecipes), [recipes, subRecipes]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY, tables);
    syncToFirestore({ tables });
  }, [tables]);

  useEffect(() => {
    saveToStorage(PAYMENTS_KEY, paymentsHistory);
  }, [paymentsHistory]);

  const activeOrder = tables[activeTable];

  const addItem = (name: string, price: number) => {
    setTables(prev => {
      const updated = [...prev];
      const order = { ...updated[activeTable] };
      const existing = order.items.find(i => i.name === name);
      if (existing) {
        order.items = order.items.map(i => i.name === name ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        order.items = [...order.items, { id: Date.now().toString(), name, quantity: 1, unitPrice: price }];
      }
      order.status = 'ocupado';
      updated[activeTable] = order;
      return updated;
    });
    setShowProductMenu(false);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setTables(prev => {
      const updated = [...prev];
      const order = { ...updated[activeTable] };
      order.items = order.items.map(i => {
        if (i.id !== itemId) return i;
        const newQty = i.quantity + delta;
        return newQty <= 0 ? null : { ...i, quantity: newQty };
      }).filter(Boolean) as OrderItem[];
      if (order.items.length === 0) {
        order.status = 'libre';
        order.customerName = '';
      }
      updated[activeTable] = order;
      return updated;
    });
  };

  const subtotal = activeOrder.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const openPayment = () => {
    setPaymentMethod(null);
    setCashAmount('');
    setShowConfirmPayment(false);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    if (!paymentMethod) return;
    if (paymentMethod === 'efectivo') {
      const paid = parseFloat(cashAmount);
      if (!paid || paid < subtotal) return;
      setShowConfirmPayment(true);
      return;
    }
    setShowConfirmPayment(true);
  };

  const confirmPayment = () => {
    const paid = paymentMethod === 'efectivo' ? parseFloat(cashAmount) : subtotal;
    const payment: PaymentData = {
      tableId: activeTable + 1,
      items: [...activeOrder.items],
      subtotal,
      method: paymentMethod!,
      amountPaid: paymentMethod === 'efectivo' ? paid : undefined,
      change: paymentMethod === 'efectivo' ? paid - subtotal : undefined,
      date: new Date().toLocaleString('es-PE'),
    };
    setPaymentsHistory(prev => [payment, ...prev]);
    setTables(prev => {
      const updated = [...prev];
      updated[activeTable] = { items: [], status: 'libre', customerName: '' };
      return updated;
    });
    setShowPaymentModal(false);
    setShowConfirmPayment(false);
  };

  const formatCurrency = (n: number) => `S/${n.toFixed(2)}`;

  return (
    <main className="min-h-screen bg-gray-100 p-2 md:p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/menu" className="text-blue-600 hover:underline text-sm md:text-base">
            ← Volver al menú
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">Ventas</h1>
          <button onClick={() => setShowHistory(true)} className="text-blue-600 hover:underline text-sm md:text-base">
            Historial
          </button>
        </div>

        {/* Table Tabs */}
        <div className="flex gap-1 md:gap-2 mb-4 overflow-x-auto">
          {tables.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTable(i)}
              className={`px-3 md:px-5 py-2 rounded-t-lg font-bold text-sm md:text-base whitespace-nowrap transition ${i === activeTable ? 'bg-white text-gray-800 shadow-md border-t-2 border-x-2 border-green-500' : t.status === 'ocupado' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}
            >
              Mesa {i + 1} {t.status === 'ocupado' && `(${t.items.reduce((s, it) => s + it.quantity, 0)})`}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
          {/* Table Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-lg md:text-xl font-bold">Mesa {activeTable + 1}</h2>
              <p className="text-sm text-gray-500">{activeOrder.status === 'ocupado' ? activeOrder.items.length + ' productos' : 'Mesa libre'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowProductMenu(true)} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm">
                + Agregar Producto
              </button>
              {activeOrder.status === 'ocupado' && (
                <button onClick={openPayment} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm">
                  Cobrar
                </button>
              )}
            </div>
          </div>

          {/* Order Items */}
          {activeOrder.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🍽️</p>
              <p>Mesa libre. Agrega productos para empezar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Producto</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">P. Unit.</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeOrder.items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-800">{item.name}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 bg-red-100 text-red-600 rounded hover:bg-red-200 font-bold text-sm leading-none">−</button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 bg-green-100 text-green-600 rounded hover:bg-green-200 font-bold text-sm leading-none">+</button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => updateQuantity(item.id, -item.quantity)} className="text-gray-400 hover:text-red-500 text-sm" title="Eliminar">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right">TOTAL</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(subtotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Product Menu Modal */}
        {showProductMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold">Agregar Producto</h2>
                <button onClick={() => setShowProductMenu(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {productCategories.map(cat => (
                  <div key={cat.name} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 font-semibold text-left"
                    >
                      <span className="text-gray-800">{cat.name}</span>
                      <span className="text-gray-400">{expandedCategory === cat.name ? '▼' : '▶'}</span>
                    </button>
                    {expandedCategory === cat.name && (
                      <div className="divide-y divide-gray-100">
                        {cat.items.map(item => (
                          <button
                            key={item.name}
                            onClick={() => addItem(item.name, item.price)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-50 transition text-left"
                          >
                            <span className="text-gray-800">{item.name}</span>
                            <span className="text-green-700 font-bold">{formatCurrency(item.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && !showConfirmPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl p-6">
              <h2 className="text-xl font-bold mb-2">Cobrar Mesa {activeTable + 1}</h2>
              <p className="text-3xl font-bold text-center mb-6">{formatCurrency(subtotal)}</p>

              <div className="space-y-3 mb-6">
                <button onClick={() => setPaymentMethod('efectivo')} className={`w-full px-4 py-3 rounded-lg border-2 text-left font-medium transition ${paymentMethod === 'efectivo' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  💵 Efectivo
                </button>
                <button onClick={() => setPaymentMethod('yape')} className={`w-full px-4 py-3 rounded-lg border-2 text-left font-medium transition ${paymentMethod === 'yape' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  📱 Yape
                </button>
                <button onClick={() => setPaymentMethod('pos')} className={`w-full px-4 py-3 rounded-lg border-2 text-left font-medium transition ${paymentMethod === 'pos' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  💳 Tarjeta / POS
                </button>
              </div>

              {paymentMethod === 'efectivo' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                  {cashAmount && parseFloat(cashAmount) >= subtotal && (
                    <p className="text-green-700 font-bold mt-2">
                      Vuelto: {formatCurrency(parseFloat(cashAmount) - subtotal)}
                    </p>
                  )}
                  {cashAmount && parseFloat(cashAmount) < subtotal && parseFloat(cashAmount) > 0 && (
                    <p className="text-red-600 text-sm mt-1">Falta S/{(subtotal - parseFloat(cashAmount)).toFixed(2)}</p>
                  )}
                </div>
              )}

              {paymentMethod === 'yape' && (
                <div className="text-center py-3 text-gray-600">Escanea el código QR de Yape para pagar.</div>
              )}

              {paymentMethod === 'pos' && (
                <div className="text-center py-3 text-gray-600">Pasa la tarjeta por el POS para procesar el pago.</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePayment}
                  disabled={!paymentMethod || (paymentMethod === 'efectivo' && (!cashAmount || parseFloat(cashAmount) < subtotal))}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Cobrar
                </button>
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Payment */}
        {showConfirmPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl p-6 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold mb-2">Pago Confirmado</h2>
              <p className="text-gray-600 mb-1">Mesa {activeTable + 1} — {paymentMethod === 'efectivo' ? 'Efectivo' : paymentMethod === 'yape' ? 'Yape' : 'Tarjeta/POS'}</p>
              <p className="text-2xl font-bold mb-1">{formatCurrency(subtotal)}</p>
              {paymentMethod === 'efectivo' && cashAmount && (
                <p className="text-green-700 font-bold mb-4">Vuelto: {formatCurrency(parseFloat(cashAmount) - subtotal)}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={confirmPayment} className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">
                  Finalizar
                </button>
                <button onClick={() => setShowConfirmPayment(false)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
                  Atrás
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl shadow-xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold">Historial de Cobros</h2>
                <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {paymentsHistory.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Sin cobros registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {paymentsHistory.map((p, i) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold">Mesa {p.tableId}</span>
                          <span className="text-sm text-gray-500">{p.date}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {p.items.length} productos · {p.method === 'efectivo' ? '💵 Efectivo' : p.method === 'yape' ? '📱 Yape' : '💳 POS'}
                          </span>
                          <span className="font-bold">{formatCurrency(p.subtotal)}</span>
                        </div>
                        {p.amountPaid && p.change !== undefined && (
                          <p className="text-sm text-gray-500 mt-1">
                            Pagó: {formatCurrency(p.amountPaid)} · Vuelto: {formatCurrency(p.change)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  Total cobrado: {formatCurrency(paymentsHistory.reduce((sum, p) => sum + p.subtotal, 0))}
                </span>
                <button onClick={() => setShowHistory(false)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
