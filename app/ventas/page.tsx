"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { printReceipt } from "@/lib/printTicket";

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

interface TableOrder {
  items: OrderItem[];
  status: 'libre' | 'ocupado';
  customerName: string;
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

interface MenuItem {
  name: string;
  price: number;
}

interface SizeOption {
  label: string;
  price: number;
}

interface PizzaProduct {
  name: string;
  sizes: SizeOption[];
}

interface MenuItemGroup {
  name: string;
  items: MenuItem[];
}

interface MenuCategory {
  name: string;
  type: 'pizza' | 'simple' | 'grouped';
  items: MenuItem[];
  pizzas: PizzaProduct[];
  groups?: MenuItemGroup[];
}

const SALES_CATEGORIES = ['ENTRADAS', 'PIZZAS CLÁSICAS', 'PIZZAS VEGETARIANAS', 'PIZZAS ESPECIALES', 'PASTAS RELLENAS', 'PASTAS', 'PROMOCIONES'];

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
  { id: '30', category: 'PIZZAS ESPECIALES', name: 'Panorama' },
  { id: '31', category: 'PIZZAS ESPECIALES', name: 'Italiana' },
  { id: '32', category: 'PIZZAS ESPECIALES', name: '4 Quesos' },
  { id: '33', category: 'PIZZAS ESPECIALES', name: 'Rústica' },
  { id: '34', category: 'PIZZAS ESPECIALES', name: 'Huerta & Mar' },
  { id: '35', category: 'PIZZAS ESPECIALES', name: 'Buscaiola' },
  { id: '36', category: 'PIZZAS ESPECIALES', name: 'Capricciosa' },
  { id: '37', category: 'PASTAS RELLENAS', name: 'Lasagna Boloñesa' },
  { id: '38', category: 'PASTAS RELLENAS', name: 'Lasagna Vegetariana' },
  { id: '39', category: 'PASTAS RELLENAS', name: 'Berenjena Parmesana' },
  { id: '12', category: 'PASTAS', name: 'Spaghetti Carbonara' },
  { id: '13', category: 'PASTAS', name: 'Fettuccine Alfredo' },
  { id: '56', category: 'PROMOCIONES', name: 'Lasagna 2x1' },
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

// Precios explicitos por pizza y tamaño
const pizzaPrices: Record<string, Record<string, number>> = {
  'Americana':         { '8 Pzas.': 40, '12 Pzas.': 55 },
  'Pepperoni':         { '8 Pzas.': 40, '12 Pzas.': 55 },
  'Hawaiana':          { '8 Pzas.': 40, '12 Pzas.': 55 },
  'Jamón y Champiñones': { '8 Pzas.': 40, '12 Pzas.': 50 },
  'Margherita':        { '8 Pzas.': 40, '12 Pzas.': 55 },
  'Marinara':          { '8 Pzas.': 35, '12 Pzas.': 50 },
  'Napoli':            { '8 Pzas.': 40, '12 Pzas.': 55 },
  'Vegetariana':       { '8 Pzas.': 45, '12 Pzas.': 60 },
  'Sorrentina':        { '8 Pzas.': 45, '12 Pzas.': 60 },
  'Mediterranea':      { '8 Pzas.': 45, '12 Pzas.': 60 },
  'Panorama':          { '8 Pzas.': 50, '12 Pzas.': 65 },
  'Italiana':          { '8 Pzas.': 55, '12 Pzas.': 70 },
  '4 Quesos':          { '8 Pzas.': 50, '12 Pzas.': 65 },
  'Rústica':           { '8 Pzas.': 50, '12 Pzas.': 65 },
  'Huerta & Mar':      { '8 Pzas.': 50, '12 Pzas.': 65 },
  'Buscaiola':         { '8 Pzas.': 50, '12 Pzas.': 65 },
  'Capricciosa':       { '8 Pzas.': 50, '12 Pzas.': 65 },
  'BBQ Chicken':       { '8 Pzas.': 32, '12 Pzas.': 40 },
};

const bebidasGroups: MenuItemGroup[] = [
  {
    name: 'Limonadas',
    items: [
      { name: 'Limonada Hierba Buena', price: 13 },
      { name: 'Limonada Kion', price: 13 },
      { name: 'Limonada Clásica', price: 13 },
      { name: 'Jarra de Limonada', price: 30 },
    ],
  },
  {
    name: 'Bebidas',
    items: [
      { name: 'Maracuyá', price: 13 },
      { name: 'Mango', price: 13 },
      { name: 'Gaseosa 500 ml', price: 8 },
      { name: 'Botella de agua', price: 6 },
      { name: 'Gaseosa 1.5 L', price: 15 },
    ],
  },
  {
    name: 'Cervezas',
    items: [
      { name: 'Cerveza Pilsen', price: 13 },
      { name: 'Cerveza Cusqueña', price: 13 },
      { name: 'Cerveza Corona', price: 14 },
    ],
  },
  {
    name: 'Infusiones',
    items: [
      { name: 'Té / Manzanilla / Anís', price: 5 },
    ],
  },
  {
    name: 'Vinos y Sangrías',
    items: [
      { name: 'Sangría 1L', price: 70 },
      { name: 'Sangría 1/2L', price: 40 },
      { name: 'Vino por copa', price: 25 },
      { name: 'Aperol Spritz', price: 35 },
      { name: 'Chilcano clásico', price: 35 },
      { name: 'Chilcano de Maracuyá', price: 35 },
    ],
  },
];

const nonPizzaPrices: Record<string, number> = {
  'Pan al ajo': 15, 'Bruschetta': 20, 'Crostini misti': 30,
  'Spaghetti Carbonara': 28, 'Fettuccine Alfredo': 28, 'Lasagna Boloñesa': 40, 'Lasagna Vegetariana': 40, 'Berenjena Parmesana': 40,
  'Lasagna 2x1': 50,
};

const sizeLabels = ['8 Pzas.', '12 Pzas.', '16 Pzas.'];

const initialTables: TableOrder[] = Array.from({ length: 11 }, () => ({
  items: [],
  status: 'libre',
  customerName: '',
}));
const DELIVERY_INDEX = 9;
const TOGO_INDEX = 10;
const tableName = (i: number) =>
  i === DELIVERY_INDEX ? 'DELIVERY' :
  i === TOGO_INDEX ? 'TO GO' :
  `Mesa ${i + 1}`;

function nowStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${dd}, ${hh}:${mi}:${ss}`;
}

const STORAGE_KEY = 'masa-ventas-tables';
const PAYMENTS_KEY = 'masa-ventas-payments';

function saveToStorage(key: string, data: unknown) {
  if (typeof window === 'undefined') return;
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
  const cleaned = JSON.parse(JSON.stringify(data));
  if (Object.keys(cleaned).length === 0) return;
  try {
    await db.collection('config').doc('ventas').set(cleaned, { merge: true });
  } catch (e) {
    console.error('Firestore sync error:', e);
  }
}

function buildMenu(recipes: { id: string; category: string; name: string }[], subRecipes: { id: string; parentId: string; name: string }[]): MenuCategory[] {
  const categories: MenuCategory[] = [];
  const pizzaCatSet = new Set(['PIZZAS CLÁSICAS', 'PIZZAS VEGETARIANAS', 'PIZZAS ESPECIALES']);

  for (const catName of SALES_CATEGORIES) {
    const catRecipes = recipes.filter(r => r.category === catName);
    if (catRecipes.length === 0) continue;
    const displayName = catName === 'PIZZAS CLÁSICAS' ? 'Pizzas Clásicas'
      : catName === 'PIZZAS VEGETARIANAS' ? 'Pizzas Vegetarianas'
      : catName === 'PIZZAS ESPECIALES' ? 'Pizzas Especiales'
      : catName === 'PASTAS RELLENAS' ? 'Pastas Rellenas'
      : catName.charAt(0) + catName.slice(1).toLowerCase();

    if (pizzaCatSet.has(catName)) {
      const pizzas: PizzaProduct[] = [];
      for (const recipe of catRecipes) {
        const sizes = pizzaPrices[recipe.name];
        if (!sizes) continue;
        const recipeSubs = subRecipes.filter(s => s.parentId === recipe.id);
        if (recipeSubs.length > 0) {
          const sizesList: SizeOption[] = [];
          for (const sub of recipeSubs) {
            const sizeName = sub.name.includes('8 Pzas.') ? '8 Pzas.' : sub.name.includes('12 Pzas.') ? '12 Pzas.' : sub.name.includes('16 Pzas.') ? '16 Pzas.' : '';
            const price = sizes[sizeName];
            if (price) sizesList.push({ label: sizeName, price });
          }
          pizzas.push({ name: recipe.name, sizes: sizesList });
        } else {
          pizzas.push({
            name: recipe.name,
            sizes: sizeLabels.map(label => ({ label, price: sizes[label] })),
          });
        }
      }
      categories.push({ name: displayName, type: 'pizza', items: [], pizzas });
    } else if (catName === 'PROMOCIONES') {
      // Build promotions as grouped category with dynamic pizza 2x1 sub-group
      const groups: MenuItemGroup[] = [];
      // Pizzas 2x1: all PIZZAS CLÁSICAS at 8 Pzas. price
      const classicRecipes = recipes.filter(r => r.category === 'PIZZAS CLÁSICAS');
      const pizzaItems: MenuItem[] = [];
      for (const recipe of classicRecipes) {
        const price = pizzaPrices[recipe.name]?.['8 Pzas.'];
        if (price) pizzaItems.push({ name: `${recipe.name} 2x1 (8 Pzas.)`, price });
      }
      if (pizzaItems.length > 0) groups.push({ name: 'Pizzas 2x1 (8 Pzas.)', items: pizzaItems });
      // Other promotions from PROMOCIONES recipes
      const otherItems: MenuItem[] = [];
      for (const recipe of catRecipes) {
        const price = nonPizzaPrices[recipe.name];
        if (price) otherItems.push({ name: recipe.name, price });
      }
      if (otherItems.length > 0) groups.push({ name: 'Ofertas', items: otherItems });
      if (groups.length > 0) categories.push({ name: 'Promociones', type: 'grouped', items: [], pizzas: [], groups });
    } else {
      const items: MenuItem[] = [];
      const seen = new Set<string>();
      for (const recipe of catRecipes) {
        const price = nonPizzaPrices[recipe.name];
        if (price && !seen.has(recipe.name)) { items.push({ name: recipe.name, price }); seen.add(recipe.name); }
      }
      if (items.length > 0) categories.push({ name: displayName, type: 'simple', items, pizzas: [] });
    }
  }

  categories.push({ name: 'Bebidas', type: 'grouped', items: [], pizzas: [], groups: bebidasGroups });
  return categories;
}

export default function Ventas() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tables, setTables] = useState<TableOrder[]>(() => {
    const stored = loadFromStorage<TableOrder[]>(STORAGE_KEY, initialTables);
    if (stored.length < 11) {
      const padded = [...stored];
      while (padded.length < 11) padded.push({ items: [], status: 'libre', customerName: '' });
      return padded;
    }
    return stored;
  });
  const [activeTable, setActiveTable] = useState(0);
  const [showProductMenu, setShowProductMenu] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedPizza, setExpandedPizza] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'menu' | 'cart'>('menu');
  const [showHalfPicker, setShowHalfPicker] = useState(false);
  const [halfPizza1, setHalfPizza1] = useState('');
  const [halfPizza2, setHalfPizza2] = useState('');
  const [halfSizeLabel, setHalfSizeLabel] = useState('');
  const [halfCategoryPizzas, setHalfCategoryPizzas] = useState<{ name: string; sizes: { label: string; price: number }[] }[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'yape' | 'pos' | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState('');
  const [syncedMessage, setSyncedMessage] = useState('');
  const [paymentsHistory, setPaymentsHistory] = useState<PaymentData[]>(() => loadFromStorage(PAYMENTS_KEY, []));
  const [recipes, setRecipes] = useState(defaultRecipes);
  const [subRecipes, setSubRecipes] = useState(defaultSubRecipes);
  const [recipeIngredients, setRecipeIngredients] = useState<Record<string, RecipeIngredient[]>>({});
  const [subIngredients, setSubIngredients] = useState<Record<string, RecipeIngredient[]>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === "togo") setActiveTable(TOGO_INDEX);
    if (user?.role === "waiter" && activeTable === TOGO_INDEX) setActiveTable(0);
  }, [user, activeTable]);

  if (authLoading) return <main className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Cargando...</p></main>;
  if (!user) return null;

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
    setRecipeIngredients(loadFromStorage<Record<string, RecipeIngredient[]>>('masa-recipeIngredients', {}));
    setSubIngredients(loadFromStorage<Record<string, RecipeIngredient[]>>('masa-subIngredients', {}));
    setInventory(loadFromStorage<InventoryItem[]>('masa-inventory', []));

    // Real-time Firestore listener for cross-device sync
    const db = getDb();
    if (db) {
      const unsub1 = db.collection('config').doc('ventas')
        .onSnapshot((snap: any) => {
          if (!snap.exists) return;
          const data = snap.data();
          if (data.tables && Array.isArray(data.tables) && data.tables.length >= 11) {
            setTables(prev => {
              const incoming = JSON.stringify(data.tables);
              const current = JSON.stringify(prev);
              return incoming === current ? prev : data.tables;
            });
          }
          if (data.payments && Array.isArray(data.payments)) {
            setPaymentsHistory(prev => {
              // Don't overwrite with stale data (shorter array = older snapshot)
              if (data.payments.length < prev.length) return prev;
              const incoming = JSON.stringify(data.payments);
              const current = JSON.stringify(prev);
              return incoming === current ? prev : data.payments;
            });
          }
        });
      const unsub2 = db.collection('masa').doc('data')
        .onSnapshot((snap: any) => {
          if (!snap.exists) return;
          const data = snap.data();
          if (data.inventory && Array.isArray(data.inventory)) {
            setInventory(prev => {
              const incoming = JSON.stringify(data.inventory);
              const current = JSON.stringify(prev);
              return incoming === current ? prev : data.inventory;
            });
          }
          if (data.recipeIngredients && typeof data.recipeIngredients === 'object') {
            setRecipeIngredients(prev => {
              const incoming = JSON.stringify(data.recipeIngredients);
              const current = JSON.stringify(prev);
              return incoming === current ? prev : data.recipeIngredients;
            });
          }
          if (data.subIngredients && typeof data.subIngredients === 'object') {
            setSubIngredients(prev => {
              const incoming = JSON.stringify(data.subIngredients);
              const current = JSON.stringify(prev);
              return incoming === current ? prev : data.subIngredients;
            });
          }
        });
      return () => { unsub1(); unsub2(); };
    }
  }, []);

  const productCategories = useMemo(() => buildMenu(recipes, subRecipes), [recipes, subRecipes]);

  // On mount: merge local + remote payments and sync to Firestore
  useEffect(() => {
    (async () => {
      const local = loadFromStorage<PaymentData[]>(PAYMENTS_KEY, []);
      const db = getDb();
      let remote: PaymentData[] = [];
      if (db) {
        try {
          const snap = await db.collection('config').doc('ventas').get();
          if (snap.exists) { const d = snap.data(); if (d.payments && Array.isArray(d.payments)) remote = d.payments; }
        } catch (_) {}
      }
      // Always merge both: prefer remote (Firestore is source of truth),
      // then add any local-only payments (unsynced)
      const remoteMap = new Map(remote.map(p => [p.id, p]));
      const merged = [...remote, ...local.filter(p => !remoteMap.has(p.id))];
      // Only write if there's new local data to add
      if (merged.length !== remote.length) {
        syncToFirestore({ payments: merged });
      }
    })();
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEY, tables);
    syncToFirestore({ tables });
  }, [tables]);

  const isFirstPaymentSync = useRef(true);
  useEffect(() => {
    if (isFirstPaymentSync.current) { isFirstPaymentSync.current = false; return; }
    saveToStorage(PAYMENTS_KEY, paymentsHistory);
    syncToFirestore({ payments: paymentsHistory });
  }, [paymentsHistory]);

  const prevMenuOpen = useRef(false);
  useEffect(() => {
    if (prevMenuOpen.current && !showProductMenu) {
      const order = tables[activeTable];
      if (order?.status === 'ocupado' && order.items.length > 0) {
        printReceipt({
          tableName: tableName(activeTable),
          items: order.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
        });
      }
    }
    prevMenuOpen.current = showProductMenu;
  }, [showProductMenu, tables, activeTable]);

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
    setTipAmount('');
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
    const tip = parseFloat(tipAmount) || 0;
    const payment: PaymentData = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      tableId: activeTable + 1,
      items: [...activeOrder.items],
      subtotal,
      tip,
      method: paymentMethod!,
      ...(paymentMethod === 'efectivo' ? { amountPaid: paid, change: paid - subtotal } : {}),
      date: nowStr(),
    };
    setPaymentsHistory(prev => {
      return [payment, ...prev];
    });
    setTables(prev => {
      const updated = [...prev];
      updated[activeTable] = { items: [], status: 'libre', customerName: '' };
      return updated;
    });

    // Register cash movements in Caja Chica
    if (paymentMethod === 'efectivo') {
      const now = nowStr();
      const cajaKey = 'masa-caja-chica';
      const cajaData = loadFromStorage<{ initialAmount: number; transactions: { id: string; type: string; description: string; amount: number; date: string }[] } | null>(cajaKey, null) || { initialAmount: 200, transactions: [] };
      // Ingreso: el efectivo recibido del cliente
      cajaData.transactions.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        type: 'INGRESO',
        description: `Venta ${tableName(activeTable)} - Efectivo (recibido S/${paid.toFixed(2)})`,
        amount: paid,
        date: now,
      });
      // Gasto: el vuelto entregado al cliente
      const cambio = paid - subtotal;
      if (cambio > 0) {
        cajaData.transactions.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          type: 'GASTO',
          description: `Vuelto ${tableName(activeTable)}`,
          amount: cambio,
          date: now,
        });
      }
      saveToStorage(cajaKey, cajaData);
      // Sync to Firestore
      const db = getDb();
      if (db) {
        db.collection('config').doc('cajaChica').set(cajaData, { merge: true }).catch(() => {});
      }
    }

    // Deduct inventory stock from sold items
    const updatedInventory = deductInventoryForItems(payment.items, recipeIngredients, subIngredients, inventory);
    if (updatedInventory.some((item, i) => item.currentStock !== inventory[i]?.currentStock)) {
      setInventory(updatedInventory);
      saveToStorage('masa-inventory', updatedInventory);
      const db = getDb();
      if (db) {
        db.collection('masa').doc('data').set({ inventory: updatedInventory }, { merge: true }).catch(() => {});
      }
    }

    setShowPaymentModal(false);
    setShowConfirmPayment(false);
  };

  const deductInventoryForItems = (
    items: OrderItem[],
    ings: Record<string, RecipeIngredient[]>,
    subIngs: Record<string, RecipeIngredient[]>,
    inv: InventoryItem[],
  ): InventoryItem[] => {
    const recipeByName = new Map(recipes.map(r => [r.name.toLowerCase(), r.id]));
    const subRecipeByName = new Map(subRecipes.map(sr => [sr.name.toLowerCase(), sr.id]));
    const updated = inv.map(item => ({ ...item }));

    for (const sold of items) {
      const nameLower = sold.name.toLowerCase();
      let ingredients: RecipeIngredient[] = [];

      const subId = subRecipeByName.get(nameLower);
      if (subId && subIngs[subId]) {
        ingredients = subIngs[subId];
      } else {
        const recipeId = recipeByName.get(nameLower);
        if (recipeId && ings[recipeId]) {
          ingredients = ings[recipeId];
        }
      }

      for (const ing of ingredients) {
        const ingNameLower = ing.name.toLowerCase().trim();
        const totalQty = ing.quantity * sold.quantity;
        const idx = updated.findIndex(i => i.name.toLowerCase().trim() === ingNameLower);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], currentStock: Math.max(0, updated[idx].currentStock - totalQty) };
        }
      }
    }

    return updated;
  };

  const formatCurrency = (n: number) => `S/${n.toFixed(2)}`;

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const parsePaymentDate = (dateStr: string) => {
    try {
      const dp = dateStr.split(',')[0].trim();
      const parts = dp.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dp)) return dp;
    } catch {}
    return '';
  };

  const openHistory = () => {
    setHistoryDate(todayStr());
    setShowHistory(true);
  };

  const handleResync = async () => {
    const local = loadFromStorage<PaymentData[]>(PAYMENTS_KEY, []);
    if (local.length === 0) { setSyncedMessage('No hay pagos locales'); setTimeout(() => setSyncedMessage(''), 2000); return; }
    const db = getDb();
    let remote: PaymentData[] = [];
    if (db) {
      try {
        const snap = await db.collection('config').doc('ventas').get();
        if (snap.exists) { const d = snap.data(); if (d.payments && Array.isArray(d.payments)) remote = d.payments; }
      } catch (_) {}
    }
    const remoteMap = new Map(remote.map(p => [p.id, p]));
    const merged = [...remote, ...local.filter(p => !remoteMap.has(p.id))];
    await syncToFirestore({ payments: merged });
    setSyncedMessage(`Sincronizados ${merged.length} pago(s)`);
    setTimeout(() => setSyncedMessage(''), 3000);
  };

  const filteredPayments = useMemo(() => {
    if (!historyDate) return [];
    return paymentsHistory.filter(p => parsePaymentDate(p.date) === historyDate);
  }, [paymentsHistory, historyDate]);

  return (
    <main className="min-h-screen bg-gray-100 p-2 md:p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/menu" className="text-blue-600 hover:underline text-sm md:text-base">
            ← Volver al menú
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">Ventas</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleResync} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700 font-medium">
              ↻ Sincronizar
            </button>
            <button onClick={openHistory} className="text-blue-600 hover:underline text-sm md:text-base">
              Historial
            </button>
          </div>
        </div>
        {syncedMessage && (
          <div className="mb-2 text-sm text-green-700 bg-green-100 border border-green-200 rounded px-3 py-1.5 text-center">
            {syncedMessage}
          </div>
        )}

        {/* Table Tabs */}
        <div className="flex gap-1 md:gap-2 mb-4 overflow-x-auto">
          {tables.map((t, i) => {
            if (user?.role === "togo" && i !== TOGO_INDEX) return null;
            if (user?.role === "waiter" && i === TOGO_INDEX) return null;
            return (
            <button
              key={i}
              onClick={() => setActiveTable(i)}
              className={`px-3 md:px-5 py-2 rounded-t-lg font-bold text-sm md:text-base whitespace-nowrap transition ${i === activeTable ? 'bg-white text-gray-800 shadow-md border-t-2 border-x-2 border-green-500' : t.status === 'ocupado' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}
            >
              {tableName(i)} {t.status === 'ocupado' && `(${t.items.reduce((s, it) => s + it.quantity, 0)})`}
            </button>
          )})}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
          {/* Table Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-lg md:text-xl font-bold">{tableName(activeTable)}</h2>
              <p className="text-sm text-gray-500">{activeOrder.status === 'ocupado' ? activeOrder.items.length + ' productos' : activeTable === DELIVERY_INDEX ? 'Delivery' : activeTable === TOGO_INDEX ? 'To Go' : 'Mesa libre'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowProductMenu(true); setModalTab('menu'); }} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm">
                + Agregar Producto
              </button>
              {activeOrder.status === 'ocupado' && (
                <button onClick={openPayment} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm">
                  Cobrar
                </button>
              )}
              {activeOrder.status === 'ocupado' && activeOrder.items.length > 0 && (
                <button
                  onClick={() => printReceipt({
                    tableName: tableName(activeTable),
                    items: activeOrder.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
                  })}
                  className="px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 text-sm"
                >
                  Imprimir
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
                <h2 className="text-lg font-bold">{tableName(activeTable)}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalTab(modalTab === 'menu' ? 'cart' : 'menu')}
                    className={`text-sm px-3 py-1.5 rounded-full font-medium transition ${modalTab === 'cart' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Pedido {tables[activeTable]?.items?.length > 0 && `(${tables[activeTable].items.reduce((s, i) => s + i.quantity, 0)})`}
                  </button>
                  <button onClick={() => setShowProductMenu(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">✕</button>
                </div>
              </div>
              {modalTab === 'menu' ? (
                showHalfPicker ? (
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4">
                      <button
                        onClick={() => setShowHalfPicker(false)}
                        className="text-sm text-gray-500 hover:text-gray-700 mb-3"
                      >
                        ← Volver al menú
                      </button>
                      <h3 className="text-lg font-bold text-gray-800 mb-3">Mitad y mitad</h3>

                      {/* First half (fixed) */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-xs text-green-600 font-medium mb-1">Primera mitad</p>
                        <p className="font-bold text-gray-800">{halfPizza1}</p>
                      </div>

                      {/* Second half selector */}
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Segunda mitad</p>
                        <div className="grid grid-cols-2 gap-2">
                          {halfCategoryPizzas
                            .filter(p => p.name !== halfPizza1)
                            .map(p => (
                              <button
                                key={p.name}
                                onClick={() => setHalfPizza2(p.name)}
                                className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition ${
                                  halfPizza2 === p.name
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Size selector */}
                      {halfPizza2 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Tamaño</p>
                          <div className="grid grid-cols-3 gap-2">
                            {halfCategoryPizzas.find(p => p.name === halfPizza1)?.sizes.map(size => (
                              <button
                                key={size.label}
                                onClick={() => setHalfSizeLabel(size.label)}
                                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition text-center ${
                                  halfSizeLabel === size.label
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <span className="block">{size.label}</span>
                                <span className="block text-xs text-gray-500">{formatCurrency(size.price)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Confirm button */}
                      {halfPizza2 && halfSizeLabel && (
                        <button
                          onClick={() => {
                            const pizza1Data = halfCategoryPizzas.find(p => p.name === halfPizza1);
                            const pizza2Data = halfCategoryPizzas.find(p => p.name === halfPizza2);
                            const size1 = pizza1Data?.sizes.find(s => s.label === halfSizeLabel);
                            const size2 = pizza2Data?.sizes.find(s => s.label === halfSizeLabel);
                            const price = Math.max(size1?.price || 0, size2?.price || 0);
                            if (price > 0) {
                              addItem(`1/2 ${halfPizza1} + 1/2 ${halfPizza2} (${halfSizeLabel})`, price);
                              setShowHalfPicker(false);
                            }
                          }}
                          className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
                        >
                          Agregar — {formatCurrency(Math.max(
                            (halfCategoryPizzas.find(p => p.name === halfPizza1)?.sizes.find(s => s.label === halfSizeLabel)?.price) || 0,
                            (halfCategoryPizzas.find(p => p.name === halfPizza2)?.sizes.find(s => s.label === halfSizeLabel)?.price) || 0
                          ))}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {productCategories.map(cat => (
                      <div key={cat.name} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            if (expandedCategory === cat.name) {
                              setExpandedCategory(null);
                              setExpandedPizza(null);
                            } else {
                              setExpandedCategory(cat.name);
                              setExpandedPizza(null);
                            }
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 font-semibold text-left"
                        >
                          <span className="text-gray-800">{cat.name}</span>
                          <span className="text-gray-400">{expandedCategory === cat.name ? '▼' : '▶'}</span>
                        </button>
                        {expandedCategory === cat.name && (
                          <div className="divide-y divide-gray-100">
                            {cat.type === 'pizza' ? cat.pizzas.map(pizza => (
                              <div key={pizza.name}>
                                <button
                                  onClick={() => setExpandedPizza(expandedPizza === pizza.name ? null : pizza.name)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left"
                                >
                                  <span className="text-gray-800 font-medium text-sm">{pizza.name}</span>
                                  <span className="text-gray-400 text-xs">{expandedPizza === pizza.name ? '▼' : '▶'}</span>
                                </button>
                                {expandedPizza === pizza.name && (
                                  <div className="bg-gray-50 border-t border-gray-100">
                                    {pizza.sizes.map(size => (
                                      <button
                                        key={size.label}
                                        onClick={() => addItem(`${pizza.name} ${size.label}`, size.price)}
                                        className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-green-50 transition text-left text-sm"
                                      >
                                        <span className="text-gray-700">{size.label}</span>
                                        <span className="text-green-700 font-bold">{formatCurrency(size.price)}</span>
                                      </button>
                                    ))}
                                    <button
                                    onClick={() => {
                                      const allPizzas = productCategories
                                        .filter(c => c.type === 'pizza')
                                        .flatMap(c => c.pizzas);
                                      setHalfPizza1(pizza.name);
                                      setHalfPizza2('');
                                      setHalfSizeLabel('');
                                      setHalfCategoryPizzas(allPizzas);
                                      setShowHalfPicker(true);
                                    }}
                                      className="w-full flex items-center justify-center px-6 py-2.5 hover:bg-yellow-50 transition text-sm border-t border-gray-100 text-yellow-700 font-semibold"
                                    >
                                      🎱 Mitad y mitad
                                    </button>
                                  </div>
                                )}
                              </div>
                            )) : cat.type === 'grouped' && cat.groups ? cat.groups.map(group => (
                              <div key={group.name}>
                                <div className="px-4 py-1.5 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">{group.name}</div>
                                {group.items.map(item => (
                                  <button
                                    key={item.name}
                                    onClick={() => addItem(item.name, item.price)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 transition text-left"
                                  >
                                    <span className="text-gray-800 text-sm">{item.name}</span>
                                    <span className="text-green-700 font-bold text-sm">{formatCurrency(item.price)}</span>
                                  </button>
                                ))}
                              </div>
                            )) : cat.items.map(item => (
                              <button
                                key={item.name}
                                onClick={() => addItem(item.name, item.price)}
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 transition text-left"
                              >
                                <span className="text-gray-800 text-sm">{item.name}</span>
                                <span className="text-green-700 font-bold text-sm">{formatCurrency(item.price)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {tables[activeTable]?.items?.length === 0 ? (
                    <p className="text-gray-400 text-center mt-8">Aún no hay productos agregados</p>
                  ) : (
                    tables[activeTable]?.items?.map(item => (
                      <div key={item.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold text-gray-600"
                          >−</button>
                          <span className="w-6 text-center font-bold text-gray-800">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold text-gray-600"
                          >+</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {tables[activeTable]?.items?.length > 0 && modalTab === 'cart' && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between text-lg font-bold text-gray-800">
                    <span>Subtotal</span>
                    <span>{formatCurrency(tables[activeTable].items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))}</span>
                  </div>
                </div>
              )}
              {tables[activeTable]?.items?.length > 0 && modalTab === 'menu' && (
                <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{tables[activeTable].items.reduce((s, i) => s + i.quantity, 0)} productos</span>
                  <span className="text-sm font-bold text-gray-800">{formatCurrency(tables[activeTable].items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && !showConfirmPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl p-6">
              <h2 className="text-xl font-bold mb-2">Cobrar {tableName(activeTable)}</h2>
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

              {paymentMethod && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propina (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {parseFloat(tipAmount) > 0 && (
                    <p className="text-green-700 font-bold mt-2">
                      Total con propina: {formatCurrency(subtotal + parseFloat(tipAmount))}
                    </p>
                  )}
                </div>
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
              <p className="text-gray-600 mb-1">{tableName(activeTable)} — {paymentMethod === 'efectivo' ? 'Efectivo' : paymentMethod === 'yape' ? 'Yape' : 'Tarjeta/POS'}</p>
              <p className="text-2xl font-bold mb-1">{formatCurrency(subtotal)}</p>
              {parseFloat(tipAmount) > 0 && (
                <p className="text-green-700 font-semibold mb-1">Propina: {formatCurrency(parseFloat(tipAmount))}</p>
              )}
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
              <div className="px-4 pt-3 pb-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar fecha</label>
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {filteredPayments.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Sin cobros registrados en esta fecha.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredPayments.map((p) => (
                      <div key={p.id} className={`border rounded-lg p-3 ${p.deleted ? 'opacity-40 bg-gray-100' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${p.deleted ? 'line-through text-gray-400' : ''}`}>Mesa {p.tableId}</span>
                            {p.deleted && <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Eliminado</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{p.date}</span>
                            {!p.deleted && (
                              <button
                                onClick={() => {
                                  setPaymentsHistory(prev => {
                                    const updated = prev.map(p2 => p2.id === p.id ? { ...p2, deleted: true } : p2);
                                    return updated;
                                  });
                                }}
                                className="text-gray-400 hover:text-red-500 text-xs font-bold"
                                title="Eliminar venta"
                              >✕</button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {p.method === 'efectivo' ? '💵 Efectivo' : p.method === 'yape' ? '📱 Yape' : '💳 POS'}
                          </span>
                          <span className={`font-bold ${p.deleted ? 'line-through text-gray-400' : ''}`}>{formatCurrency(p.subtotal)}</span>
                        </div>
                        {p.tip > 0 && (
                          <p className={`text-sm mt-0.5 ${p.deleted ? 'text-gray-300' : 'text-green-700'}`}>
                            Propina: {formatCurrency(p.tip)}
                          </p>
                        )}
                        {p.amountPaid && p.change !== undefined && (
                          <p className={`text-sm mt-1 ${p.deleted ? 'text-gray-300' : 'text-gray-500'}`}>
                            Pagó: {formatCurrency(p.amountPaid)} · Vuelto: {formatCurrency(p.change)}
                          </p>
                        )}
                        <div className={`mt-2 text-xs border-t pt-2 space-y-1 ${p.deleted ? 'text-gray-400' : 'text-gray-500'}`}>
                          {p.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{item.quantity}× {item.name}</span>
                              <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Total cobrado: {formatCurrency(filteredPayments.reduce((sum, p) => p.deleted ? sum : sum + p.subtotal, 0))}</p>
                  <p>Total propinas: {formatCurrency(filteredPayments.reduce((sum, p) => p.deleted ? sum : sum + p.tip, 0))}</p>
                </div>
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
