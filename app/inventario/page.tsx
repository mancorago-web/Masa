"use client";

import { useState, useMemo, useEffect, Fragment, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

interface InventoryItem {
  id: string;
  category: string;
  name: string;
  currentStock: number;
  unit: string;
  minStock: number;
  supplier?: string;
  supplierPhone?: string;
  unitCost?: number;
}

interface SubRecipe {
  id: string;
  parentId: string;
  name: string;
}

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  cost: number;
}

interface PurchaseEntry {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
}

const initialInventory: InventoryItem[] = [
  { id: '1', category: 'BASE', name: 'Harina', currentStock: 10000, unit: 'Gramos', minStock: 10000 },
  { id: '2', category: 'BASE', name: 'Tomate (salsa)', currentStock: 1, unit: 'Caja', minStock: 1 },
  { id: '51', category: 'BASE', name: 'Salsa de tomate', currentStock: 1, unit: 'Litro', minStock: 1 },
  { id: '3', category: 'BASE', name: 'Agua', currentStock: 1, unit: 'Bidón', minStock: 1 },
  { id: '4', category: 'BASE', name: 'Sal', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '5', category: 'BASE', name: 'Azúcar', currentStock: 250, unit: 'Gramos', minStock: 250 },
  { id: '6', category: 'BASE', name: 'Levadura', currentStock: 10, unit: 'Gramos', minStock: 10 },
  { id: '7', category: 'BASE', name: 'Queso (mozarella)', currentStock: 8000, unit: 'Gramos', minStock: 8000 },
  { id: '56', category: 'BASE', name: 'Masa (Pan)', currentStock: 1, unit: 'Unidad', minStock: 1 },
  { id: '57', category: 'BASE', name: 'Salsa de ají', currentStock: 1, unit: 'Litro', minStock: 1 },
  { id: '62', category: 'BASE', name: 'Salsa boloñesa', currentStock: 1, unit: 'Litro', minStock: 1 },
  { id: '63', category: 'BASE', name: 'Salsa bechamel', currentStock: 1, unit: 'Litro', minStock: 1 },
  { id: '8', category: 'GUARNICIONES', name: 'Jamón', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '9', category: 'GUARNICIONES', name: 'Peperoni', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '10', category: 'GUARNICIONES', name: 'Tocino', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '11', category: 'GUARNICIONES', name: 'Chorizo', currentStock: 5, unit: 'Unidades', minStock: 5 },
  { id: '12', category: 'GUARNICIONES', name: 'Anchoas', currentStock: 1, unit: 'Frasco', minStock: 1 },
  { id: '13', category: 'GUARNICIONES', name: 'Brocchiuto', currentStock: 1, unit: 'Paquete', minStock: 1 },
  { id: '14', category: 'GUARNICIONES', name: 'Huevos', currentStock: 15, unit: 'Huevos', minStock: 15 },
  { id: '15', category: 'GUARNICIONES', name: 'Pulpa de res', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '16', category: 'GUARNICIONES', name: 'Bondiola de chancho', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '17', category: 'GUARNICIONES', name: 'Panceta de chancho', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '59', category: 'GUARNICIONES', name: 'Prosciutto', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '61', category: 'GUARNICIONES', name: 'Atún', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '18', category: 'VERDURAS', name: 'Tomate (guarnición)', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '19', category: 'VERDURAS', name: 'Pimiento', currentStock: 2, unit: 'Unidades', minStock: 2 },
  { id: '20', category: 'VERDURAS', name: 'Champiñones', currentStock: 6, unit: 'Latas', minStock: 6 },
  { id: '21', category: 'VERDURAS', name: 'Zuccini', currentStock: 1, unit: 'Unidad', minStock: 1 },
  { id: '22', category: 'VERDURAS', name: 'Berengena', currentStock: 1, unit: 'Unidad', minStock: 1 },
  { id: '23', category: 'VERDURAS', name: 'Ajo', currentStock: 250, unit: 'Gramos', minStock: 250 },
  { id: '24', category: 'VERDURAS', name: 'Albahaca', currentStock: 2, unit: 'Soles', minStock: 2 },
  { id: '25', category: 'VERDURAS', name: 'Piña', currentStock: 2, unit: 'Unidades', minStock: 2 },
  { id: '26', category: 'VERDURAS', name: 'Perejil', currentStock: 2, unit: 'Soles', minStock: 2 },
  { id: '27', category: 'VERDURAS', name: 'Aji limo', currentStock: 250, unit: 'Gramos', minStock: 250 },
  { id: '28', category: 'VERDURAS', name: 'Aceitunas', currentStock: 250, unit: 'Gramos', minStock: 250 },
  { id: '29', category: 'VERDURAS', name: 'Alcaparras', currentStock: 1, unit: 'Frasco', minStock: 1 },
  { id: '30', category: 'VERDURAS', name: 'Alcachofas', currentStock: 250, unit: 'Gramos', minStock: 250 },
  { id: '31', category: 'VERDURAS', name: 'Cebolla blanca', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '32', category: 'VERDURAS', name: 'Orégano', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '52', category: 'VERDURAS', name: 'Zanahoria', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '53', category: 'VERDURAS', name: 'Apio', currentStock: 1, unit: 'Unidad', minStock: 1 },
  { id: '54', category: 'VERDURAS', name: 'Poro', currentStock: 1, unit: 'Unidad', minStock: 1 },
  { id: '58', category: 'VERDURAS', name: 'Rúcula', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '33', category: 'LACTEOS', name: 'Parmesano', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '34', category: 'LACTEOS', name: 'Queso azul', currentStock: 1000, unit: 'Gramos', minStock: 1000 },
  { id: '35', category: 'LACTEOS', name: 'Mantequilla', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '55', category: 'LACTEOS', name: 'Leche', currentStock: 1, unit: 'Litro', minStock: 1 },
  { id: '60', category: 'LACTEOS', name: 'Provola', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '36', category: 'EXTRAS', name: 'Aceite de oliva', currentStock: 0.5, unit: 'Litro', minStock: 0.5 },
  { id: '37', category: 'EXTRAS', name: 'Aceite vegetal', currentStock: 2, unit: 'Litros', minStock: 2 },
  { id: '38', category: 'EXTRAS', name: 'Pimienta', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '39', category: 'EXTRAS', name: 'Pimienta roja', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '40', category: 'EXTRAS', name: 'Nuez moscada', currentStock: 1, unit: 'Unidad', minStock: 1 },
  { id: '41', category: 'EXTRAS', name: 'Spaguetti', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '42', category: 'EXTRAS', name: 'Rigatonni', currentStock: 500, unit: 'Gramos', minStock: 500 },
  { id: '43', category: 'EXTRAS', name: 'Vino tinto', currentStock: 1, unit: 'Litro', minStock: 1 },
  { id: '44', category: 'DELIVERY', name: 'Caja de pizza XL', currentStock: 50, unit: 'Unidades', minStock: 50 },
  { id: '45', category: 'DELIVERY', name: 'Caja de pizza FAMILIAR', currentStock: 50, unit: 'Unidades', minStock: 50 },
  { id: '46', category: 'DELIVERY', name: 'Caja de pizza PERSONAL', currentStock: 50, unit: 'Unidades', minStock: 50 },
  { id: '47', category: 'DELIVERY', name: 'Tapper aluminio (3/4)', currentStock: 25, unit: 'Unidades', minStock: 25 },
  { id: '48', category: 'DELIVERY', name: 'Tapper aluminio (1/2)', currentStock: 25, unit: 'Unidades', minStock: 25 },
  { id: '49', category: 'DELIVERY', name: 'Bolsas de papel', currentStock: 50, unit: 'Unidades', minStock: 50 },
  { id: '50', category: 'DELIVERY', name: 'Bolsas de bolo', currentStock: 2, unit: 'Paquetes', minStock: 2 },
];

export default function Inventario() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedRecipeCategories, setExpandedRecipeCategories] = useState<string[]>([]);
  const [expandedDatosCategories, setExpandedDatosCategories] = useState<string[]>([]);
  const [expandedComprasCategories, setExpandedComprasCategories] = useState<string[]>([]);
  const [expandedRecipeDetails, setExpandedRecipeDetails] = useState<string[]>([]);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingSubRecipeId, setEditingSubRecipeId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [showRecetasSaved, setShowRecetasSaved] = useState(false);
  const [showDatosSaved, setShowDatosSaved] = useState(false);
  const [isEditingDatos, setIsEditingDatos] = useState(false);
  const [expandedSubRecipeDetails, setExpandedSubRecipeDetails] = useState<string[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseEntry[]>([]);
  const purchaseHistoryRef = useRef(purchaseHistory);
  purchaseHistoryRef.current = purchaseHistory;
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<Record<string, { qty: number; unitCost: number }>>({});
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');

  // Auto-save purchase history to Firestore
  useEffect(() => {
    syncToFirestore({ comprasHistory: purchaseHistory });
  }, [purchaseHistory]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  if (authLoading) return <main className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Cargando...</p></main>;
  if (!user) return null;

  const getDatosInfo = (name: string, qty: number, recipeUnit: string) => {
    const item = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim() && i.unitCost);
    if (!item || !item.unitCost) return null;
    return { unitCost: item.unitCost, unit: item.unit, cost: qty * item.unitCost };
  };
  const defaultSubRecipes: SubRecipe[] = [
    { id: 's1', parentId: '19', name: 'Americana 8 Pzas.' },
    { id: 's2', parentId: '19', name: 'Americana 12 Pzas.' },
    { id: 's3', parentId: '19', name: 'Americana 16 Pzas.' },
    { id: 's4', parentId: '23', name: 'Pepperoni 8 Pzas.' },
    { id: 's5', parentId: '23', name: 'Pepperoni 12 Pzas.' },
    { id: 's6', parentId: '23', name: 'Pepperoni 16 Pzas.' },
    { id: 's7', parentId: '24', name: 'Hawaiana 8 Pzas.' },
    { id: 's8', parentId: '24', name: 'Hawaiana 12 Pzas.' },
    { id: 's9', parentId: '24', name: 'Hawaiana 16 Pzas.' },
    { id: 's10', parentId: '25', name: 'Jamón y Champiñones 8 Pzas.' },
    { id: 's11', parentId: '25', name: 'Jamón y Champiñones 12 Pzas.' },
    { id: 's12', parentId: '25', name: 'Jamón y Champiñones 16 Pzas.' },
    { id: 's13', parentId: '6', name: 'Margherita 8 Pzas.' },
    { id: 's14', parentId: '6', name: 'Margherita 12 Pzas.' },
    { id: 's15', parentId: '6', name: 'Margherita 16 Pzas.' },
    { id: 's16', parentId: '7', name: 'Marinara 8 Pzas.' },
    { id: 's17', parentId: '7', name: 'Marinara 12 Pzas.' },
    { id: 's18', parentId: '7', name: 'Marinara 16 Pzas.' },
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
  const defaultSubIngredients: Record<string, RecipeIngredient[]> = {
    's1': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's2': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's3': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 140, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's4': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pepperoni', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's5': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pepperoni', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's6': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pepperoni', quantity: 110, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's7': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Piña', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's8': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Piña', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's9': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 110, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Piña', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's10': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's11': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's12': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 110, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's13': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's14': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's15': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's16': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's17': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's18': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 35, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 35, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's19': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Anchoas', quantity: 20, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Perejil', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's20': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Anchoas', quantity: 35, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Perejil', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's21': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 35, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Anchoas', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 35, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Perejil', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's22': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Zuccini', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Berengena', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimientos', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tomate', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's23': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Zuccini', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Berengena', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimientos', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tomate', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's24': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Zuccini', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Berengena', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimientos', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tomate', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's25': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tomate', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's26': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's27': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 35, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 55, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tomate', quantity: 110, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's28': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Zuccini', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Berengena', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimiento', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Perejil', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's29': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Zuccini', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Berengena', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimiento', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Perejil', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's30': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Zuccini', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Berengena', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimiento', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 55, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcaparras', quantity: 35, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Perejil', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's31': [
      { name: 'Masa de Pizza', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa Clásica', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pollo', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla blanca', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's32': [
      { name: 'Masa de Pizza', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa Clásica', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pollo', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla blanca', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's33': [
      { name: 'Masa de Pizza', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa Clásica', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pollo', quantity: 110, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla blanca', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's34': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 0.08, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pepperoni', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tocino', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Chorizo', quantity: 1, unit: 'Unidades', unitPrice: 0, cost: 0 },
      { name: 'Rúcula', quantity: 20, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's35': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 0.12, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pepperoni', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tocino', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Chorizo', quantity: 2, unit: 'Unidades', unitPrice: 0, cost: 0 },
      { name: 'Rúcula', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's36': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 0.16, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pepperoni', quantity: 110, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tocino', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Chorizo', quantity: 3, unit: 'Unidades', unitPrice: 0, cost: 0 },
      { name: 'Rúcula', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's37': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 0.08, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Prosciutto', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Parmesano', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Rúcula', quantity: 20, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's38': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 0.12, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Prosciutto', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Parmesano', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Rúcula', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's39': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 0.16, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Prosciutto', quantity: 110, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Parmesano', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Rúcula', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's40': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso azul', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Parmesano', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Provola', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's41': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso azul', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Parmesano', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Provola', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's42': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso azul', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Parmesano', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Provola', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's43': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso azul', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tocino', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's44': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso azul', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tocino', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's45': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso azul', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Tocino', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's46': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla blanca', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Atún', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's47': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla blanca', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Atún', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's48': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla blanca', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 55, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Atún', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's49': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Chorizo', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's50': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Chorizo', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's51': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Chorizo', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's52': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcachofas', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 25, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's53': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 120, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 8, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcachofas', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 60, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 40, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    's54': [
      { name: 'Masa (Pan)', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Salsa de tomate', quantity: 160, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Queso (mozarella)', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Jamón', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcachofas', quantity: 70, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Champiñones', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceitunas', quantity: 55, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
  };

  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>(defaultSubRecipes);
  const [subRecipeIngredients, setSubRecipeIngredients] = useState<Record<string, RecipeIngredient[]>>(defaultSubIngredients);
  const nextRecipeId = useRef<number>(30);
  const deletedRecipeIds = useRef<Set<string>>(new Set());
  const deletedSubIngredientKeys = useRef<Set<string>>(new Set());

  const getDataDoc = async () => {
    const db = getDb();
    if (!db) return null;
    return db.collection('masa').doc('data');
  };

  const syncToFirestore = async (data: Record<string, unknown>) => {
    try {
      const docRef = await getDataDoc();
      if (docRef) await docRef.set(data, { merge: true });
    } catch (e) {
      console.error('Error syncing to Firestore:', e);
    }
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const docRef = await getDataDoc();
      if (!docRef) {
        setLoading(false);
        return;
      }
      unsub = docRef.onSnapshot((snap) => {
        if (!snap.exists) { setLoading(false); return; }
        setLoading(false);
        const data = snap.data();
        if (data.inventory) {
          const parsed = data.inventory;
          const base = [...initialInventory];
          const baseIds = new Set(base.map(i => i.id));
          for (const item of parsed) {
            const idx = base.findIndex(i => i.id === item.id);
            if (idx >= 0) base[idx] = item;
            else if (!baseIds.has(item.id)) { base.push(item); baseIds.add(item.id); }
          }
          setInventory(base);
        }
        if (data) {
          recetasFromFirestoreData(data);
        }
      }, (err) => {
        console.error('Firestore snapshot error:', err);
        setLoading(false);
      });
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  const saveInventory = () => {
    syncToFirestore({ inventory });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const saveRecetas = () => {
    try {
      syncToFirestore({
        recipes: recipesRef.current,
        recipeIngredients: recipeIngredientsRef.current,
        subRecipes,
        subIngredients: subRecipeIngredients,
        nextRecipeId: nextRecipeId.current,
        deletedRecipes: Array.from(deletedRecipeIds.current),
        deletedSubIngredientKeys: Array.from(deletedSubIngredientKeys.current),
      });
      setShowRecetasSaved(true);
      setTimeout(() => setShowRecetasSaved(false), 2000);
      return true;
    } catch (e) {
      console.error('Error saving recetas:', e);
      return false;
    }
  };

  const saveDatos = () => {
    syncToFirestore({ inventory });
    setShowDatosSaved(true);
    setIsEditingDatos(false);
    setTimeout(() => setShowDatosSaved(false), 2000);
  };

  const forceSubRecipes = () => {
    const currentRecipes = recipesRef.current;
    const pizzaCategories = ['PIZZAS CLÁSICAS', 'PIZZAS VEGETARIANAS', 'PIZZAS ESPECIALES'];
    setSubRecipes(prev => {
      const result = [...defaultSubRecipes];
      for (const sub of prev) {
        if (!result.some(s => s.id === sub.id)) {
          result.push(sub);
        }
      }
      let maxId = result.reduce((max, s) => {
        const num = parseInt(s.id.replace('s', ''));
        return num > max ? num : max;
      }, 0);
      for (const recipe of currentRecipes) {
        if (pizzaCategories.includes(recipe.category) && !result.some(s => s.parentId === recipe.id)) {
          result.push(
            { id: `s${maxId + 1}`, parentId: recipe.id, name: `${recipe.name} 8 Pzas.` },
            { id: `s${maxId + 2}`, parentId: recipe.id, name: `${recipe.name} 12 Pzas.` },
            { id: `s${maxId + 3}`, parentId: recipe.id, name: `${recipe.name} 16 Pzas.` }
          );
          maxId += 3;
        }
      }
      return result;
    });
  };

  const mergeSubIngredients = (saved: Record<string, RecipeIngredient[]>) => {
    const deprecatedNames = new Set(['Masa de Pizza', 'Salsa Clásica', 'Aceite de oliva', 'Cebolla', 'Aceitunas negras', 'Tomate seco', 'Alcachofa', 'Tomate cherry']);
    const deleted = deletedSubIngredientKeys.current;
    setSubRecipeIngredients(() => {
      const result: Record<string, RecipeIngredient[]> = {};
      for (const [id, defaultIngs] of Object.entries(defaultSubIngredients)) {
        const savedIngs = (saved[id] || []).filter(i => !deprecatedNames.has(i.name));
        const merged = [...defaultIngs.filter(ing => !deleted.has(`${id}:${ing.name}`))];
        for (const ing of savedIngs) {
          const idx = merged.findIndex(m => m.name === ing.name);
          if (idx >= 0) merged[idx] = ing; else merged.push(ing);
        }
        result[id] = merged;
      }
      for (const [id, savedIngs] of Object.entries(saved)) {
        if (!result[id]) result[id] = savedIngs.filter(i => !deprecatedNames.has(i.name));
      }
      return result;
    });
  };


  const recetasFromFirestoreData = (data: Record<string, unknown>) => {
    if (data.deletedRecipes && Array.isArray(data.deletedRecipes)) {
      (data.deletedRecipes as string[]).forEach(id => deletedRecipeIds.current.add(id));
    }
    if (data.recipes && Array.isArray(data.recipes)) {
      const savedById = new Map((data.recipes as { id: string }[]).map(r => [r.id, r]));
      const merged = defaultRecipes
        .filter(def => !deletedRecipeIds.current.has(def.id))
        .map(def => savedById.has(def.id) ? { ...savedById.get(def.id) } : def);
      const mergedIds = new Set(merged.map(r => r.id));
      for (const item of data.recipes as { id: string }[]) {
        if (!mergedIds.has(item.id)) { merged.push(item); mergedIds.add(item.id); }
      }
      setRecipes(merged);
      recipesRef.current = merged;
    }
    if (data.recipeIngredients && typeof data.recipeIngredients === 'object') {
      const merged = { ...defaultRecipeIngredients, ...data.recipeIngredients as Record<string, RecipeIngredient[]> };
      setRecipeIngredients(merged);
      recipeIngredientsRef.current = merged;
    }
    if (data.subRecipes && Array.isArray(data.subRecipes)) {
      setSubRecipes(data.subRecipes as SubRecipe[]);
    }
    forceSubRecipes();
    if (data.subIngredients && typeof data.subIngredients === 'object') {
      const saved = data.subIngredients as Record<string, RecipeIngredient[]>;
      mergeSubIngredients(saved);
    }
    if (data.nextRecipeId && typeof data.nextRecipeId === 'number') {
      nextRecipeId.current = data.nextRecipeId as number;
    }
    if (data.deletedSubIngredientKeys && Array.isArray(data.deletedSubIngredientKeys)) {
      (data.deletedSubIngredientKeys as string[]).forEach(k => deletedSubIngredientKeys.current.add(k));
    }
    if (data.comprasHistory && Array.isArray(data.comprasHistory)) {
      setPurchaseHistory(data.comprasHistory as PurchaseEntry[]);
    }
  };


  const categories = useMemo(() => {
    const cats = Array.from(new Set(inventory.map(item => item.category)));
    return cats;
  }, [inventory]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getStatus = (current: number, min: number) => {
    if (current >= min) return 'ok';
    return 'low';
  };

  const statusColors: Record<string, string> = {
    ok: 'bg-green-100 text-green-800',
    low: 'bg-red-100 text-red-800',
  };

  const statusText: Record<string, string> = {
    ok: 'OK',
    low: 'BAJO',
  };

  const updateStock = (id: string, newStock: number) => {
    setInventory(inventory.map(item =>
      item.id === id ? { ...item, currentStock: newStock } : item
    ));
  };

  const getItemsByCategory = (category: string) => {
    return inventory.filter(item => item.category === category);
  };

  const hasLowStockInCategory = (category: string) => {
    return inventory
      .filter(item => item.category === category)
      .some(item => getStatus(item.currentStock, item.minStock) === 'low');
  };

  const toggleDatosCategory = (category: string) => {
    setExpandedDatosCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleComprasCategory = (category: string) => {
    setExpandedComprasCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const openPurchaseModal = () => {
    const form: Record<string, { qty: number; unitCost: number }> = {};
    for (const item of inventory) {
      if (item.currentStock < item.minStock) {
        form[item.id] = { qty: item.minStock - item.currentStock, unitCost: item.unitCost || 0 };
      }
    }
    setPurchaseForm(form);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const entries: PurchaseEntry[] = [];
    const updated = inventory.map(item => {
      const formData = purchaseForm[item.id];
      if (formData && formData.qty > 0) {
        const totalCost = formData.qty * formData.unitCost;
        entries.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          date: dateStr,
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          quantity: formData.qty,
          unitCost: formData.unitCost,
          totalCost,
          unit: item.unit,
        });
        return { ...item, currentStock: item.currentStock + formData.qty };
      }
      return item;
    });
    setInventory(updated);
    syncToFirestore({ inventory: updated });
    setPurchaseHistory(prev => [...entries, ...prev]);
    setShowPurchaseModal(false);
  };

  const toggleRecipeCategory = (category: string) => {
    setExpandedRecipeCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const recipeCategories = ['SALSA DE TOMATE', 'MASAS', 'SALSA DE AJI', 'SALSA LASAGNA', 'ENTRADAS', 'PIZZAS CLÁSICAS', 'PIZZAS VEGETARIANAS', 'PIZZAS ESPECIALES', 'PASTAS RELLENAS', 'PASTAS'];

  const defaultRecipes = [
    { id: '1', category: 'SALSA DE TOMATE', name: 'Salsa Clásica' },
    { id: '14', category: 'MASAS', name: 'Masa de Pizzas' },
    { id: '18', category: 'MASAS', name: 'Masa Bechamel' },
    { id: '15', category: 'SALSA DE AJI', name: 'Salsa de Aji Clásica' },
    { id: '16', category: 'SALSA LASAGNA', name: 'Salsa Boloñesa' },
    { id: '17', category: 'SALSA LASAGNA', name: 'Salsa Bechamel' },
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
    { id: '37', category: 'PASTAS RELLENAS', name: 'Lasagna Boloñesa' },
    { id: '38', category: 'PASTAS RELLENAS', name: 'Lasagna Vegetariana' },
    { id: '39', category: 'PASTAS RELLENAS', name: 'Berenjena Parmesana' },
    { id: '12', category: 'PASTAS', name: 'Spaghetti Carbonara' },
    { id: '13', category: 'PASTAS', name: 'Fettuccine Alfredo' },
  ];

  const [recipes, setRecipes] = useState<{ id: string; category: string; name: string }[]>(defaultRecipes);
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;

  const getRecipesByCategory = (category: string) => {
    return recipes.filter(recipe => recipe.category === category);
  };

  const addRecipe = (category: string) => {
    const id = String(nextRecipeId.current++);
    setRecipes(prev => [...prev, { id, category, name: 'Nueva Receta' }]);
    setRecipeIngredients(prev => ({ ...prev, [id]: [] }));
    setExpandedRecipeDetails(prev => [...prev, id]);
  };

  const removeRecipe = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    setRecipeIngredients(prev => {
      const updated = { ...prev };
      delete updated[recipeId];
      return updated;
    });
    setExpandedRecipeDetails(prev => prev.filter(r => r !== recipeId));
  };

  const toggleRecipeDetails = (recipeId: string) => {
    setExpandedRecipeDetails(prev =>
      prev.includes(recipeId) ? prev.filter(r => r !== recipeId) : [...prev, recipeId]
    );
  };

  const startEditRecipe = (recipeId: string) => {
    setEditingRecipeId(recipeId);
  };

  const cancelEditRecipe = () => {
    setEditingRecipeId(null);
  };

  const saveRecipeEdits = (recipeId: string) => {
    setEditingRecipeId(null);
    saveRecetas();
  };

  const updateIngredient = (recipeId: string, index: number, field: keyof RecipeIngredient, value: string | number) => {
    setRecipeIngredients(prev => {
      const updated = { ...prev };
      const ingredients = [...(updated[recipeId] || [])];
      ingredients[index] = { ...ingredients[index], [field]: value };
      updated[recipeId] = ingredients;
      return updated;
    });
  };

  const addIngredient = (recipeId: string) => {
    setRecipeIngredients(prev => {
      const updated = { ...prev };
      updated[recipeId] = [...(updated[recipeId] || []), { name: '', quantity: 0, unit: 'Gramos', unitPrice: 0, cost: 0 }];
      return updated;
    });
  };

  const updateSubIngredient = (subId: string, index: number, field: keyof RecipeIngredient, value: string | number) => {
    setSubRecipeIngredients(prev => {
      const updated = { ...prev };
      const ingredients = [...(updated[subId] || [])];
      ingredients[index] = { ...ingredients[index], [field]: value };
      updated[subId] = ingredients;
      return updated;
    });
  };

  const addSubIngredient = (subId: string) => {
    setSubRecipeIngredients(prev => ({
      ...prev,
      [subId]: [...(prev[subId] || []), { name: '', quantity: 0, unit: 'Gramos', unitPrice: 0, cost: 0 }],
    }));
  };

  const removeSubIngredient = (subId: string, index: number) => {
    setSubRecipeIngredients(prev => {
      const ing = (prev[subId] || [])[index];
      if (ing) deletedSubIngredientKeys.current.add(`${subId}:${ing.name}`);
      const updated = { ...prev };
      updated[subId] = (updated[subId] || []).filter((_, i) => i !== index);
      return updated;
    });
  };

  const updateRecipeName = (recipeId: string, name: string) => {
    setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, name } : r));
  };

  const removeIngredient = (recipeId: string, index: number) => {
    setRecipeIngredients(prev => {
      const updated = { ...prev };
      updated[recipeId] = (updated[recipeId] || []).filter((_, i) => i !== index);
      return updated;
    });
  };

  const deleteRecipe = (recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    setRecipeIngredients(prev => {
      const updated = { ...prev };
      delete updated[recipeId];
      return updated;
    });
    setSubRecipes(prev => {
      const subsToRemove = prev.filter(s => s.parentId === recipeId);
      setSubRecipeIngredients(sp => {
        const updated = { ...sp };
        subsToRemove.forEach(s => delete updated[s.id]);
        return updated;
      });
      return prev.filter(s => s.parentId !== recipeId);
    });
    deletedRecipeIds.current.add(recipeId);
    saveRecetas();
  };

  const defaultRecipeIngredients: Record<string, RecipeIngredient[]> = {
    '1': [
      { name: 'Tomate (salsa)', quantity: 18000, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Sal', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Azúcar', quantity: 80, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 2, unit: 'Soles', unitPrice: 0, cost: 0 },
      { name: 'Aceite de oliva', quantity: 0.2, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla', quantity: 150, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimiento', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    '14': [
      { name: 'Harina', quantity: 1000, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Agua', quantity: 0.6, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Sal', quantity: 20, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceite de oliva', quantity: 0.1, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Levadura', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Azúcar', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    '15': [
      { name: 'Aji limo', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 20, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceite de oliva', quantity: 0.1, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Sal', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Limón', quantity: 2, unit: 'Unidades', unitPrice: 0, cost: 0 },
    ],
    '16': [
      { name: 'Tomate (salsa)', quantity: 2000, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pulpa de res', quantity: 500, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Cebolla', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 30, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceite de oliva', quantity: 0.1, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Sal', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Orégano', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Pimienta', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    '17': [
      { name: 'Mantequilla', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Harina', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Leche', quantity: 1, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Sal', quantity: 5, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Nuez moscada', quantity: 2, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    '18': [
      { name: 'Harina', quantity: 1000, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Agua', quantity: 0.5, unit: 'Litro', unitPrice: 0, cost: 0 },
      { name: 'Mantequilla', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Huevos', quantity: 4, unit: 'Huevos', unitPrice: 0, cost: 0 },
      { name: 'Sal', quantity: 15, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    '20': [
      { name: 'Pan', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Ajo', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Mantequilla', quantity: 100, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Perejil', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
    ],
    '21': [
      { name: 'Pan', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Tomate', quantity: 200, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Albahaca', quantity: 10, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceite de oliva', quantity: 0.05, unit: 'Litro', unitPrice: 0, cost: 0 },
    ],
    '22': [
      { name: 'Pan', quantity: 1, unit: 'Unidad', unitPrice: 0, cost: 0 },
      { name: 'Queso azul', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Parmesano', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Alcachofas', quantity: 50, unit: 'Gramos', unitPrice: 0, cost: 0 },
      { name: 'Aceite de oliva', quantity: 0.05, unit: 'Litro', unitPrice: 0, cost: 0 },
    ],
  };
  const [recipeIngredients, setRecipeIngredients] = useState<Record<string, RecipeIngredient[]>>(defaultRecipeIngredients);
  const recipeIngredientsRef = useRef(recipeIngredients);
  recipeIngredientsRef.current = recipeIngredients;

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        </div>
      )}
      {!loading && (
      <div className="container mx-auto">
        <div className="bg-green-50 p-6 rounded-lg shadow-md mb-6">
          <Link href="/menu" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Volver al menú
          </Link>
          <h1 className="text-2xl font-bold mb-4 text-green-900">📦 Inventario</h1>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'stock' ? 'bg-green-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Stock
            </button>
            <button
              onClick={() => setActiveTab('recetas')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'recetas' ? 'bg-green-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Recetas
            </button>
            <button
              onClick={() => setActiveTab('datos')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'datos' ? 'bg-green-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Datos
            </button>
            <button
              onClick={() => setActiveTab('compras')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'compras' ? 'bg-green-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Compras
            </button>
          </div>
        </div>

        {activeTab === 'stock' && (
          <div className="flex justify-end items-center mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={saveInventory}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 font-bold"
              >
                GUARDAR
              </button>
              {showSaved && (
                <span className="text-green-600 font-semibold">✓ Guardado</span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className={`w-full px-6 py-4 flex justify-between items-center transition-colors ${
                    hasLowStockInCategory(category)
                      ? 'bg-yellow-50 hover:bg-yellow-100'
                      : 'bg-green-50 hover:bg-green-100'
                  }`}
                >
                  <h2 className={`text-lg font-bold ${hasLowStockInCategory(category) ? 'text-yellow-900' : 'text-green-900'}`}>{category}</h2>
                  <span className={hasLowStockInCategory(category) ? 'text-yellow-700' : 'text-green-700'}>
                    {expandedCategories.includes(category) ? '▼' : '▶'}
                  </span>
                </button>

                {expandedCategories.includes(category) && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mínimo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getItemsByCategory(category).map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <input
                                type="number"
                                value={item.currentStock}
                                onChange={(e) => updateStock(item.id, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                step="0.01"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.minStock}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[getStatus(item.currentStock, item.minStock)]}`}>
                                {statusText[getStatus(item.currentStock, item.minStock)]}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => updateStock(item.id, item.currentStock + 1)}
                                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 mr-1"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => updateStock(item.id, Math.max(0, item.currentStock - 1))}
                                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                              >
                                -1
                              </button>
                              </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          ))}
          </div>
        )}

        {activeTab === 'recetas' && (
          <div>
            <div className="flex justify-end items-center mb-4">
              <button
                onClick={saveRecetas}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 font-bold"
              >
                GUARDAR
              </button>
              {showRecetasSaved && (
                <span className="ml-3 text-green-600 font-semibold">✓ Guardado</span>
              )}
            </div>
            <div className="space-y-4">
            {recipeCategories.map((category) => (
              <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => toggleRecipeCategory(category)}
                  className="w-full px-6 py-4 flex justify-between items-center bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <h2 className="text-lg font-bold text-green-900">{category}</h2>
                  <span className="text-green-700">
                    {expandedRecipeCategories.includes(category) ? '▼' : '▶'}
                  </span>
                </button>
                {expandedRecipeCategories.includes(category) && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receta</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getRecipesByCategory(category).map((recipe) => (
                          <Fragment key={recipe.id}>
                            <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRecipeDetails(recipe.id)}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <span className="mr-2">{expandedRecipeDetails.includes(recipe.id) ? '▼' : '▶'}</span>
                                {editingRecipeId === recipe.id ? (
                                  <input
                                    type="text"
                                    value={recipe.name}
                                    onChange={(e) => updateRecipeName(recipe.id, e.target.value)}
                                    className="w-40 px-1 py-0.5 border border-gray-300 rounded text-sm font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : recipe.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {editingRecipeId === recipe.id ? (
                                  <>
                                    <button
                                      onClick={() => saveRecipeEdits(recipe.id)}
                                      className="text-green-600 hover:text-green-800 font-bold mr-2"
                                    >
                                      GUARDAR
                                    </button>
                                    <button
                                      onClick={cancelEditRecipe}
                                      className="text-gray-600 hover:text-gray-800 mr-2"
                                    >
                                      CANCELAR
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex justify-between items-center">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startEditRecipe(recipe.id); }}
                                    className="text-green-600 hover:text-green-800 mr-2"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteRecipe(recipe.id); }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    ✕
                                  </button>
                                  </div>
                                )}

                              </td>
                            </tr>
                            {expandedRecipeDetails.includes(recipe.id) && (
                              <tr>
                                <td colSpan={2} className="px-6 py-2 bg-gray-50">
                                  {(() => {
                                    const subs = subRecipes.filter(s => s.parentId === recipe.id);
                                    if (subs.length > 0) {
                                      return (
                                        <div className="space-y-2">
                                          {subs.map(sub => (
                                            <div key={sub.id} className="border border-gray-200 rounded">
                                              <button
                                                onClick={() => setExpandedSubRecipeDetails(prev =>
                                                  prev.includes(sub.id) ? prev.filter(s => s !== sub.id) : [...prev, sub.id]
                                                )}
                                                className="w-full px-4 py-2 flex justify-between items-center bg-white hover:bg-gray-50 text-left"
                                              >
                                                <span className="text-sm font-semibold text-gray-700">
                                                  {expandedSubRecipeDetails.includes(sub.id) ? '▼' : '▶'} {sub.name}
                                                </span>
                                                {editingSubRecipeId === sub.id ? (
                                                  <span className="text-xs text-green-600 font-bold">EDITANDO</span>
                                                ) : (
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingSubRecipeId(sub.id); }}
                                                    className="text-xs text-green-600 hover:text-green-800 ml-2"
                                                  >
                                                    Editar
                                                  </button>
                                                )}
                                              </button>
                                              {expandedSubRecipeDetails.includes(sub.id) && subRecipeIngredients[sub.id] && (
                                                <div className="px-4 pb-2">
                                                  {editingSubRecipeId === sub.id && (
                                                    <div className="mb-2">
                                                      <button
                                                        onClick={() => addSubIngredient(sub.id)}
                                                        className="text-sm text-green-600 hover:text-green-800 font-semibold mr-3"
                                                      >
                                                        + Agregar ingrediente
                                                      </button>
                                                      <button
                                                        onClick={() => { setEditingSubRecipeId(null); saveRecetas(); }}
                                                        className="text-sm text-gray-600 hover:text-gray-800 font-semibold"
                                                      >
                                                        Hecho
                                                      </button>
                                                    </div>
                                                  )}
                                                  <table className="w-full">
                                                    <thead>
                                                      <tr className="border-b border-gray-200">
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredientes</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                                                        {editingSubRecipeId === sub.id && (
                                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                                        )}
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {subRecipeIngredients[sub.id].map((ing, idx) => (
                                                        <tr key={idx} className="border-b border-gray-100">
                                                          <td className="px-3 py-2 text-sm text-gray-900">
                                                            {editingSubRecipeId === sub.id ? (
                                                              <input type="text" value={ing.name} onChange={(e) => updateSubIngredient(sub.id, idx, 'name', e.target.value)} className="w-24 px-1 py-0.5 border border-gray-300 rounded text-sm" />
                                                            ) : ing.name}
                                                          </td>
                                                          <td className="px-3 py-2 text-sm text-gray-900">
                                                            {editingSubRecipeId === sub.id ? (
                                                              <input type="number" value={ing.quantity} onChange={(e) => updateSubIngredient(sub.id, idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm" step="0.01" />
                                                            ) : ing.quantity}
                                                          </td>
                                                          <td className="px-3 py-2 text-sm text-gray-900">
                                                            {(() => {
                                                              const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                              const displayUnit = datos ? datos.unit : ing.unit;
                                                              return editingSubRecipeId === sub.id ? (
                                                                <input type="text" value={displayUnit} onChange={(e) => updateSubIngredient(sub.id, idx, 'unit', e.target.value)} className="w-14 px-1 py-0.5 border border-gray-300 rounded text-sm" />
                                                              ) : displayUnit;
                                                            })()}
                                                          </td>
                                                          <td className="px-3 py-2 text-sm text-gray-900">
                                                            {(() => {
                                                              const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                              const displayPrice = datos ? datos.unitCost : ing.unitPrice;
                                                              return editingSubRecipeId === sub.id ? (
                                                                <input type="number" value={displayPrice} onChange={(e) => updateSubIngredient(sub.id, idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm" step="0.01" />
                                                              ) : (displayPrice === 0 ? '-' : `S/ ${displayPrice.toFixed(2)}`);
                                                            })()}
                                                          </td>
                                                          <td className="px-3 py-2 text-sm text-gray-900">
                                                            {(() => {
                                                              const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                              const cost = datos ? datos.cost : (ing.unitPrice * ing.quantity);
                                                              const unitPrice = datos ? datos.unitCost : ing.unitPrice;
                                                              return unitPrice === 0 && ing.quantity === 0 ? '-' : `S/ ${cost.toFixed(2)}`;
                                                            })()}
                                                          </td>
                                                          {editingSubRecipeId === sub.id && (
                                                            <td className="px-3 py-2 text-sm">
                                                              <button onClick={() => removeSubIngredient(sub.id, idx)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                                                            </td>
                                                          )}
                                                         </tr>
                                                       ))}
                                                       <tr className="bg-green-50">
                                                         <td colSpan={4} className="px-3 py-2 text-sm font-bold text-right text-green-900">TOTAL</td>
                                                         <td className="px-3 py-2 text-sm font-bold text-green-900">
                                                           {(() => {
                                                             const total = (subRecipeIngredients[sub.id] || []).reduce((sum, ing) => {
                                                               const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                               return sum + (datos ? datos.cost : (ing.quantity * ing.unitPrice));
                                                             }, 0);
                                                             return total === 0 ? '-' : `S/ ${total.toFixed(2)}`;
                                                           })()}
                                                         </td>
                                                         {editingSubRecipeId === sub.id && <td></td>}
                                                       </tr>
                                                     </tbody>
                                                   </table>
                                                 </div>
                                               )}
                                             </div>
                                           ))}
                                         </div>
                                       );
                                     }
                                     if (recipeIngredients[recipe.id]) {
                                      return (
                                        <>
                                          <div className="mb-2">
                                            {editingRecipeId === recipe.id && (
                                              <button
                                                onClick={() => addIngredient(recipe.id)}
                                                className="text-sm text-green-600 hover:text-green-800 font-semibold"
                                              >
                                                + Agregar ingrediente
                                              </button>
                                            )}
                                          </div>
                                          <table className="w-full">
                                            <thead>
                                              <tr className="border-b border-gray-200">
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredientes</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {recipeIngredients[recipe.id].map((ing, idx) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                  <td className="px-4 py-2 text-sm text-gray-900">
                                                    {editingRecipeId === recipe.id ? (
                                                      <input
                                                        type="text"
                                                        value={ing.name}
                                                        onChange={(e) => updateIngredient(recipe.id, idx, 'name', e.target.value)}
                                                        className="w-28 px-1 py-0.5 border border-gray-300 rounded text-sm"
                                                      />
                                                    ) : ing.name}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-900">
                                                    {editingRecipeId === recipe.id ? (
                                                      <input
                                                        type="number"
                                                        value={ing.quantity}
                                                        onChange={(e) => updateIngredient(recipe.id, idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm"
                                                        step="0.01"
                                                      />
                                                    ) : ing.quantity}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-900">
                                                    {(() => {
                                                      const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                      const displayUnit = datos ? datos.unit : ing.unit;
                                                      return editingRecipeId === recipe.id ? (
                                                        <input
                                                          type="text"
                                                          value={displayUnit}
                                                          onChange={(e) => updateIngredient(recipe.id, idx, 'unit', e.target.value)}
                                                          className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm"
                                                        />
                                                      ) : displayUnit;
                                                    })()}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-900">
                                                    {(() => {
                                                      const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                      const displayPrice = datos ? datos.unitCost : ing.unitPrice;
                                                      return editingRecipeId === recipe.id ? (
                                                        <input
                                                          type="number"
                                                          value={displayPrice}
                                                          onChange={(e) => updateIngredient(recipe.id, idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                          className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm"
                                                          step="0.01"
                                                        />
                                                      ) : (displayPrice === 0 ? '-' : `S/ ${displayPrice.toFixed(2)}`);
                                                    })()}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-900">
                                                    {(() => {
                                                      const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                      const cost = datos ? datos.cost : (ing.unitPrice * ing.quantity);
                                                      const unitPrice = datos ? datos.unitCost : ing.unitPrice;
                                                      return unitPrice === 0 && ing.quantity === 0 ? '-' : `S/ ${cost.toFixed(2)}`;
                                                    })()}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm">
                                                    <button
                                                      onClick={() => removeIngredient(recipe.id, idx)}
                                                      className="text-red-500 hover:text-red-700 text-xs"
                                                    >
                                                      ✕
                                                    </button>
                                                  </td>
                                                </tr>
                                              ))}
                                              <tr className="bg-green-50">
                                                <td colSpan={4} className="px-4 py-2 text-sm font-bold text-right text-green-900">TOTAL</td>
                                                <td className="px-4 py-2 text-sm font-bold text-green-900">
                                                  {(() => {
                                                    const total = recipeIngredients[recipe.id].reduce((sum, ing) => {
                                                      const datos = getDatosInfo(ing.name, ing.quantity, ing.unit);
                                                      return sum + (datos ? datos.cost : (ing.quantity * ing.unitPrice));
                                                    }, 0);
                                                    return total === 0 ? '-' : `S/ ${total.toFixed(2)}`;
                                                  })()}
                                                </td>
                                                <td></td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </>
                                      );
                                    }
                                    return null;
                                  })()}
                                </td>
                              </tr>
                            )}
                            </Fragment>
                        ))}
                        {getRecipesByCategory(category).length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-6 py-4 text-center text-gray-500">No hay recetas en esta categoría.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <div className="px-6 py-3 border-t border-gray-100">
                      <button
                        onClick={() => addRecipe(category)}
                        className="text-sm text-green-600 hover:text-green-800 font-semibold"
                      >
                        + Agregar Receta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        {activeTab === 'compras' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-500">
                Productos con stock por debajo del mínimo — se actualiza automáticamente
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-4 text-sm font-semibold">
                  {(() => {
                    const allItems = inventory.filter(i => i.currentStock < i.minStock);
                    const totalItems = allItems.length;
                    const totalCost = allItems.reduce((s, i) => s + (i.unitCost ? (i.minStock - i.currentStock) * i.unitCost : 0), 0);
                    return (
                      <>
                        <span className="text-orange-700">{totalItems} producto(s) por comprar</span>
                        {totalCost > 0 && <span className="text-gray-900">Total estimado: S/{totalCost.toFixed(2)}</span>}
                      </>
                    );
                  })()}
                </div>
                {inventory.some(i => i.currentStock < i.minStock) && (
                  <button onClick={openPurchaseModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold text-sm">
                    Registrar compras
                  </button>
                )}
              </div>
            </div>
            {categories.filter(cat => inventory.some(item => item.category === cat && item.currentStock < item.minStock)).length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-green-600 text-lg font-semibold">✓ Todos los productos tienen stock suficiente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.filter(cat => inventory.some(item => item.category === cat && item.currentStock < item.minStock)).map((category) => {
                  const itemsToBuy = inventory.filter(item => item.category === category && item.currentStock < item.minStock);
                  return (
                    <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <button
                        onClick={() => toggleComprasCategory(category)}
                        className="w-full px-6 py-4 flex justify-between items-center bg-orange-50 hover:bg-orange-100 transition-colors"
                      >
                        <h2 className="text-lg font-bold text-orange-900">{category}</h2>
                        <span className="text-orange-700">
                          {expandedComprasCategories.includes(category) ? '▼' : '▶'}
                        </span>
                      </button>

                      {expandedComprasCategories.includes(category) && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mínimo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant. a Comprar</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unit.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {itemsToBuy.map((item) => {
                                const qtyToBuy = item.minStock - item.currentStock;
                                const totalCost = item.unitCost ? qtyToBuy * item.unitCost : null;
                                return (
                                  <tr key={item.id} className="hover:bg-orange-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.currentStock.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{item.minStock.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-orange-700">{qtyToBuy.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{item.unit}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{item.unitCost ? `S/${item.unitCost.toFixed(2)}` : '—'}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{totalCost !== null ? `S/${totalCost.toFixed(2)}` : '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{item.supplier || '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'compras' && purchaseHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Historial de compras</h3>

            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                  <input type="date" value={dateFilterStart} onChange={e => setDateFilterStart(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                  <input type="date" value={dateFilterEnd} onChange={e => setDateFilterEnd(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <button onClick={() => { setDateFilterStart(''); setDateFilterEnd(''); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium">Limpiar</button>
              </div>
            </div>

            {(() => {
              const filtered = purchaseHistory.filter(entry => {
                const d = entry.date.slice(0, 10);
                if (dateFilterStart && d < dateFilterStart) return false;
                if (dateFilterEnd && d > dateFilterEnd) return false;
                return true;
              });
              const totalFiltered = filtered.reduce((s, e) => s + e.totalCost, 0);
              return (
                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Cantidad</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Costo Unit.</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filtered.slice(0, 200).map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{entry.date}</td>
                          <td className="px-4 py-3 text-gray-900">{entry.itemName}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{entry.quantity} {entry.unit}</td>
                          <td className="px-4 py-3 text-right text-gray-700">S/{entry.unitCost.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">S/{entry.totalCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-800">
                          {dateFilterStart || dateFilterEnd ? 'TOTAL FILTRADO' : 'TOTAL GENERAL'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          S/{totalFiltered.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {filtered.length === 0 && <p className="text-center text-gray-400 py-6">No hay registros en ese rango de fechas.</p>}
                </div>
              );
            })()}
          </div>
        )}

        {/* Purchase Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold">Registrar compras</h2>
                <button onClick={() => setShowPurchaseModal(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">✕</button>
              </div>
              <div className="overflow-y-auto p-4 flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Producto</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Unidad</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Stock Actual</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Cant. a comprar</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Costo Unit. (S/)</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Total (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(purchaseForm).map(([itemId, formData]) => {
                      const item = inventory.find(i => i.id === itemId);
                      if (!item) return null;
                      const total = formData.qty * formData.unitCost;
                      return (
                        <tr key={itemId} className="hover:bg-orange-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-semibold">{item.currentStock.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={formData.qty}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setPurchaseForm(prev => ({ ...prev, [itemId]: { ...prev[itemId], qty: val } }));
                              }}
                              className="w-20 text-right border border-gray-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.unitCost}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setPurchaseForm(prev => ({ ...prev, [itemId]: { ...prev[itemId], unitCost: val } }));
                              }}
                              className="w-24 text-right border border-gray-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">S/{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 p-4 border-t">
                {(() => {
                  const total = Object.values(purchaseForm).reduce((s, f) => s + f.qty * f.unitCost, 0);
                  return <span className="text-lg font-bold text-gray-900 mr-auto">Total: S/{total.toFixed(2)}</span>;
                })()}
                <button onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold">
                  Cancelar
                </button>
                <button onClick={confirmPurchase} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">
                  Confirmar compras
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'datos' && (
          <div>
            <div className="flex justify-end items-center mb-4 gap-2">
              <button
                onClick={() => setIsEditingDatos(!isEditingDatos)}
                className={`px-6 py-2 rounded-lg font-bold ${isEditingDatos ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              >
                {isEditingDatos ? 'CANCELAR' : 'EDITAR'}
              </button>
              <button
                onClick={saveDatos}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 font-bold"
              >
                GUARDAR
              </button>
              {showDatosSaved && (
                <span className="ml-2 text-green-600 font-semibold">✓ Guardado</span>
              )}
            </div>
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleDatosCategory(category)}
                    className="w-full px-6 py-4 flex justify-between items-center bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <h2 className="text-lg font-bold text-green-900">{category}</h2>
                    <span className="text-green-700">
                      {expandedDatosCategories.includes(category) ? '▼' : '▶'}
                    </span>
                  </button>
                  {expandedDatosCategories.includes(category) && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant. Mínima</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unit.</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getItemsByCategory(category).map((item, idx) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="text"
                                  placeholder="Nombre"
                                  value={item.name || ''}
                                  onChange={(e) => {
                                    const newInv = [...inventory];
                                    const i = newInv.findIndex(x => x.id === item.id);
                                    if (i >= 0) { newInv[i] = { ...newInv[i], name: e.target.value }; setInventory(newInv); }
                                  }}
                                  disabled={!isEditingDatos}
                                  className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${isEditingDatos ? 'border-gray-300' : 'border-transparent bg-transparent'}`}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="text"
                                  placeholder="Proveedor"
                                  value={item.supplier || ''}
                                  onChange={(e) => {
                                    const newInv = [...inventory];
                                    const i = newInv.findIndex(x => x.id === item.id);
                                    if (i >= 0) { newInv[i] = { ...newInv[i], supplier: e.target.value }; setInventory(newInv); }
                                  }}
                                  disabled={!isEditingDatos}
                                  className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${isEditingDatos ? 'border-gray-300' : 'border-transparent bg-transparent'}`}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="text"
                                  placeholder="Número"
                                  value={item.supplierPhone || ''}
                                  onChange={(e) => {
                                    const newInv = [...inventory];
                                    const i = newInv.findIndex(x => x.id === item.id);
                                    if (i >= 0) { newInv[i] = { ...newInv[i], supplierPhone: e.target.value }; setInventory(newInv); }
                                  }}
                                  disabled={!isEditingDatos}
                                  className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${isEditingDatos ? 'border-gray-300' : 'border-transparent bg-transparent'}`}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {isEditingDatos ? (
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(e) => {
                                      const newInv = [...inventory];
                                      const i = newInv.findIndex(x => x.id === item.id);
                                      if (i >= 0) { newInv[i] = { ...newInv[i], unit: e.target.value }; setInventory(newInv); }
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                  />
                                ) : item.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {isEditingDatos ? (
                                  <input
                                    type="number"
                                    value={item.minStock}
                                    onChange={(e) => {
                                      const newInv = [...inventory];
                                      const i = newInv.findIndex(x => x.id === item.id);
                                      if (i >= 0) { newInv[i] = { ...newInv[i], minStock: parseFloat(e.target.value) || 0 }; setInventory(newInv); }
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                    step="0.01"
                                  />
                                ) : item.minStock}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={item.unitCost ?? ''}
                                  onChange={(e) => {
                                    const newInv = [...inventory];
                                    const i = newInv.findIndex(x => x.id === item.id);
                                    if (i >= 0) { newInv[i] = { ...newInv[i], unitCost: parseFloat(e.target.value) || 0 }; setInventory(newInv); }
                                  }}
                                  disabled={!isEditingDatos}
                                  className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${isEditingDatos ? 'border-gray-300' : 'border-transparent bg-transparent'}`}
                                  step="0.01"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </main>
  );
}
