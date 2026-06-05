"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";

interface Transaction {
  id: string;
  type: 'GASTO' | 'IMPRESVISTO' | 'AJUSTE';
  description: string;
  amount: number;
  date: string;
}

const STORAGE_KEY = 'masa-caja-chica';

function loadFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveToStorage(data: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function syncToFirestore(data: Record<string, unknown>) {
  const db = getDb();
  if (!db) return;
  try {
    const doc = db.collection('config').doc('cajaChica');
    await doc.set(data, { merge: true });
  } catch (e) {
    console.error('Firestore sync error:', e);
  }
}

const defaultInitialAmount = 200;

export default function CajaChica() {
  const [initialAmount, setInitialAmount] = useState(defaultInitialAmount);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isEditingInitial, setIsEditingInitial] = useState(false);
  const [editInitialValue, setEditInitialValue] = useState(defaultInitialAmount);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'GASTO' | 'IMPRESVISTO'>('GASTO');
  const [modalDescription, setModalDescription] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setInitialAmount(saved.initialAmount ?? defaultInitialAmount);
      setTransactions(saved.transactions ?? []);
    }
  }, []);

  useEffect(() => {
    const data = { initialAmount, transactions };
    saveToStorage(data);
    syncToFirestore(data);
  }, [initialAmount, transactions]);

  const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = initialAmount - totalExpenses;

  const handleSaveInitial = () => {
    const val = parseFloat(editInitialValue as unknown as string) || 0;
    if (val < 0) return;
    const diff = val - initialAmount;
    setInitialAmount(val);
    setIsEditingInitial(false);
    if (diff !== 0) {
      const t: Transaction = {
        id: Date.now().toString(),
        type: 'AJUSTE',
        description: diff > 0 ? `Ajuste inicial (+S/${diff.toFixed(2)})` : `Ajuste inicial (-S/${Math.abs(diff).toFixed(2)})`,
        amount: diff > 0 ? -diff : Math.abs(diff),
        date: new Date().toLocaleString('es-PE'),
      };
      if (diff > 0) t.amount = 0;
      setTransactions(prev => [t, ...prev]);
    }
  };

  const openModal = (type: 'GASTO' | 'IMPRESVISTO') => {
    setModalType(type);
    setModalDescription('');
    setModalAmount('');
    setShowAddModal(true);
  };

  const handleAddTransaction = () => {
    const amount = parseFloat(modalAmount);
    if (!amount || amount <= 0) return;
    if (!modalDescription.trim()) return;
    const t: Transaction = {
      id: Date.now().toString(),
      type: modalType,
      description: modalDescription.trim(),
      amount,
      date: new Date().toLocaleString('es-PE'),
    };
    setTransactions(prev => [t, ...prev]);
    setShowAddModal(false);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const formatCurrency = (n: number) => `S/${n.toFixed(2)}`;

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/menu" className="text-blue-600 hover:underline inline-block">
            ← Volver al menú
          </Link>
          {savedMessage && (
            <span className="text-green-600 font-bold text-sm">✓ Guardado</span>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-6">Caja Chica</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <p className="text-sm text-gray-500 mb-1">Fondo Inicial</p>
            {isEditingInitial ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={editInitialValue}
                  onChange={(e) => setEditInitialValue(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border rounded text-lg font-bold"
                  autoFocus
                />
                <button onClick={handleSaveInitial} className="text-green-600 hover:text-green-800 font-bold text-sm">OK</button>
                <button onClick={() => setIsEditingInitial(false)} className="text-gray-500 hover:text-gray-700 text-sm">X</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(initialAmount)}</p>
                <button onClick={() => { setEditInitialValue(initialAmount); setIsEditingInitial(true); }} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
              </div>
            )}
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <p className="text-sm text-gray-500 mb-1">Total Gastos</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <p className="text-sm text-gray-500 mb-1">Saldo Actual</p>
            <p className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(currentBalance)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => openModal('GASTO')} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition">
            + Agregar Gasto
          </button>
          <button onClick={() => openModal('IMPRESVISTO')} className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition">
            + Agregar Imprevisto
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-lg font-bold p-4 border-b">Historial de Movimientos</h2>
          {transactions.length === 0 ? (
            <p className="p-4 text-gray-500">No hay movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'GASTO' ? 'bg-orange-100 text-orange-700' : t.type === 'IMPRESVISTO' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {t.type === 'GASTO' ? 'Gasto' : t.type === 'IMPRESVISTO' ? 'Imprevisto' : 'Ajuste'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{t.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">-{formatCurrency(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Transaction Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold mb-4">
                {modalType === 'GASTO' ? 'Agregar Gasto' : 'Agregar Imprevisto'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    placeholder="Ej: Pago a moto, Compra de insumos..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleAddTransaction} className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">
                    Guardar
                  </button>
                  <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
