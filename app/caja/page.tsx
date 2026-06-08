"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/firebase";

interface Transaction {
  id: string;
  type: 'GASTO' | 'AJUSTE';
  description: string;
  amount: number;
  date: string;
  deleted?: boolean;
}

interface DailyRecord {
  date: string;
  initialAmount: number;
  transactions: Transaction[];
  totalExpenses: number;
  finalBalance: number;
}

const STORAGE_KEY = 'masa-caja-chica';
const DAILY_RECORDS_KEY = 'masa-caja-chica-daily';

function todayStr() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
}

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

function loadDailyRecordsFromStorage(): Record<string, DailyRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(DAILY_RECORDS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveDailyRecordsToStorage(records: Record<string, DailyRecord>) {
  localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(records));
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

async function saveDailyRecordToFirestore(record: DailyRecord) {
  const db = getDb();
  if (!db) return;
  try {
    await db.collection('cajaChicaDaily').doc(record.date).set(record);
  } catch (e) {
    console.error('Firestore daily record sync error:', e);
  }
}

async function loadDailyRecordsFromFirestore(): Promise<DailyRecord[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db.collection('cajaChicaDaily').orderBy('date', 'desc').get();
    return snap.docs.map((d: any) => d.data() as DailyRecord);
  } catch (e) {
    console.error('Firestore load daily records error:', e);
    return [];
  }
}

const defaultInitialAmount = 200;

export default function CajaChica() {
  const [initialAmount, setInitialAmount] = useState(defaultInitialAmount);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isEditingInitial, setIsEditingInitial] = useState(false);
  const [editInitialValue, setEditInitialValue] = useState(defaultInitialAmount);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalDescription, setModalDescription] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [savedMessage, setSavedMessage] = useState(false);
  const [showRegistro, setShowRegistro] = useState(false);
  const [registroDate, setRegistroDate] = useState(todayStr());
  const [registroRecord, setRegistroRecord] = useState<DailyRecord | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const dailyRecordsRef = useRef<Record<string, DailyRecord>>({});

  const todayRef = useRef(todayStr());
  const initialAmountRef = useRef(initialAmount);
  const transactionsRef = useRef(transactions);
  initialAmountRef.current = initialAmount;
  transactionsRef.current = transactions;

  // Save daily record helper
  const saveDailySnapshot = useRef((date: string, init: number, txns: Transaction[]) => {
    const activeTotal = txns.reduce((sum, t) => t.deleted ? sum : sum + t.amount, 0);
    const record: DailyRecord = {
      date,
      initialAmount: init,
      transactions: txns,
      totalExpenses: activeTotal,
      finalBalance: init - activeTotal,
    };
    dailyRecordsRef.current = { ...dailyRecordsRef.current, [date]: record };
    saveDailyRecordsToStorage(dailyRecordsRef.current);
    saveDailyRecordToFirestore(record);
    setAvailableDates(Object.keys(dailyRecordsRef.current).sort().reverse());
  }).current;

  useEffect(() => {
    // Load cached daily records first
    const cached = loadDailyRecordsFromStorage();
    dailyRecordsRef.current = cached;
    setAvailableDates(Object.keys(cached).sort().reverse());

    const saved = loadFromStorage();
    const today = todayStr();
    todayRef.current = today;
    if (saved) {
      const init = saved.initialAmount ?? defaultInitialAmount;
      const txns = saved.transactions ?? [];
      // Archive transactions from previous days
      const todayTxns = txns.filter((t: Transaction) => {
        const tDate = t.date ? t.date.split(',')[0].trim() : '';
        const tDay = tDate ? new Date(tDate).toLocaleDateString('en-CA') : '';
        return !tDate || tDay === today;
      });
      const olderTxns = txns.filter((t: Transaction) => {
        const tDate = t.date ? t.date.split(',')[0].trim() : '';
        const tDay = tDate ? new Date(tDate).toLocaleDateString('en-CA') : '';
        return tDate && tDay !== today;
      });
      // Save older transactions as daily records grouped by date
      const byDate: Record<string, Transaction[]> = {};
      for (const t of olderTxns) {
        const tDate = t.date ? t.date.split(',')[0].trim() : '';
        const tDay = tDate ? new Date(tDate).toLocaleDateString('en-CA') : '';
        if (tDay) {
          if (!byDate[tDay]) byDate[tDay] = [];
          byDate[tDay].push(t);
        }
      }
      let updatedRecords = { ...dailyRecordsRef.current };
      for (const [date, dayTxns] of Object.entries(byDate)) {
        const dayInit = defaultInitialAmount;
        const activeTotal = dayTxns.reduce((sum, t) => t.deleted ? sum : sum + t.amount, 0);
        updatedRecords[date] = {
          date,
          initialAmount: dayInit,
          transactions: dayTxns,
          totalExpenses: activeTotal,
          finalBalance: dayInit - activeTotal,
        };
        saveDailyRecordToFirestore(updatedRecords[date]);
      }
      dailyRecordsRef.current = updatedRecords;
      saveDailyRecordsToStorage(updatedRecords);
      setAvailableDates(Object.keys(updatedRecords).sort().reverse());

      setInitialAmount(init);
      setTransactions(todayTxns);
      // If there were old transactions, update storage
      if (olderTxns.length > 0) {
        const newData = { initialAmount: init, transactions: todayTxns };
        saveToStorage(newData);
        syncToFirestore(newData);
      }
      // Ensure today's record exists
      const activeTotal = todayTxns.reduce((sum, t) => t.deleted ? sum : sum + t.amount, 0);
      const todayRecord: DailyRecord = {
        date: today,
        initialAmount: init,
        transactions: todayTxns,
        totalExpenses: activeTotal,
        finalBalance: init - activeTotal,
      };
      dailyRecordsRef.current[today] = todayRecord;
      saveDailyRecordsToStorage(dailyRecordsRef.current);
      saveDailyRecordToFirestore(todayRecord);
      setAvailableDates(Object.keys(dailyRecordsRef.current).sort().reverse());
    } else {
      // No saved data — save today's empty record
      const emptyRecord: DailyRecord = {
        date: today,
        initialAmount: defaultInitialAmount,
        transactions: [],
        totalExpenses: 0,
        finalBalance: defaultInitialAmount,
      };
      dailyRecordsRef.current[today] = emptyRecord;
      saveDailyRecordsToStorage(dailyRecordsRef.current);
      saveDailyRecordToFirestore(emptyRecord);
      setAvailableDates(Object.keys(dailyRecordsRef.current).sort().reverse());
    }
  }, [saveDailySnapshot]);

  // Midnight auto-close: check every 30s if the date changed
  useEffect(() => {
    const interval = setInterval(() => {
      const now = todayStr();
      if (now !== todayRef.current) {
        const prevDate = todayRef.current;
        const prevInit = initialAmountRef.current;
        const prevTxns = transactionsRef.current;
        todayRef.current = now;
        // Snapshot the previous day
        saveDailySnapshot(prevDate, prevInit, prevTxns);
        // Reset for new day
        setTransactions([]);
        setInitialAmount(prevInit);
        const newData = { initialAmount: prevInit, transactions: [] };
        saveToStorage(newData);
        syncToFirestore(newData);
        saveDailySnapshot(now, prevInit, []);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [saveDailySnapshot]);

  useEffect(() => {
    const data = { initialAmount, transactions };
    saveToStorage(data);
    syncToFirestore(data);
    // Auto-save today's daily record
    saveDailySnapshot(todayRef.current, initialAmount, transactions);
  }, [initialAmount, transactions, saveDailySnapshot]);

  const totalExpenses = transactions.reduce((sum, t) => t.deleted ? sum : sum + t.amount, 0);
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

  const openModal = () => {
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
      type: 'GASTO',
      description: modalDescription.trim(),
      amount,
      date: new Date().toLocaleString('es-PE'),
    };
    setTransactions(prev => [t, ...prev]);
    setShowAddModal(false);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: true } : t));
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const openRegistro = async () => {
    setLoadingRecords(true);
    setRegistroDate(todayStr());
    setRegistroRecord(null);
    // Try to load from Firestore for fresh data
    const firestoreRecords = await loadDailyRecordsFromFirestore();
    if (firestoreRecords.length > 0) {
      const merged: Record<string, DailyRecord> = {};
      for (const r of firestoreRecords) {
        merged[r.date] = r;
      }
      // Merge with localStorage cache (local takes precedence for today)
      const cached = loadDailyRecordsFromStorage();
      dailyRecordsRef.current = { ...merged, ...cached };
    } else {
      dailyRecordsRef.current = loadDailyRecordsFromStorage();
    }
    setAvailableDates(Object.keys(dailyRecordsRef.current).sort().reverse());
    setShowRegistro(true);
    setLoadingRecords(false);
  };

  const viewRegistroDate = (date: string) => {
    setRegistroDate(date);
    setRegistroRecord(dailyRecordsRef.current[date] || null);
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
                  className="w-24 px-2 py-1 border rounded bg-white text-gray-900 text-lg font-bold"
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
          <button onClick={openModal} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition">
            + Agregar Gasto
          </button>
          <button onClick={openRegistro} className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition">
            Registro
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
                    <tr key={t.id} className={`${t.deleted ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'GASTO' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {t.type === 'GASTO' ? 'Gasto' : 'Ajuste'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${t.deleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.description}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${t.deleted ? 'text-gray-400 line-through' : 'text-red-600'}`}>-{formatCurrency(t.amount)}</span>
                        {!t.deleted && (
                          <button onClick={() => handleDeleteTransaction(t.id)} className="ml-2 text-gray-400 hover:text-red-500 transition" title="Eliminar">
                            ✕
                          </button>
                        )}
                      </td>
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
              <h2 className="text-xl font-bold mb-4">Agregar Gasto</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    placeholder="Ej: Pago a moto, Compra de insumos..."
                    className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
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

        {/* Registro Modal */}
        {showRegistro && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Registro Diario</h2>
                <button onClick={() => setShowRegistro(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">✕</button>
              </div>
              <div className="p-4 border-b bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar fecha</label>
                <select
                  value={registroDate}
                  onChange={(e) => viewRegistroDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {availableDates.length === 0 && <option value="">No hay registros</option>}
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingRecords ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : registroRecord ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Fondo Inicial</p>
                        <p className="text-lg font-bold text-gray-800">{formatCurrency(registroRecord.initialAmount)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Total Gastos</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(registroRecord.totalExpenses)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Saldo Final</p>
                        <p className={`text-lg font-bold ${registroRecord.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(registroRecord.finalBalance)}</p>
                      </div>
                    </div>
                    {registroRecord.transactions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Sin movimientos este día.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Hora</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Tipo</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Descripción</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {registroRecord.transactions.map(t => (
                              <tr key={t.id} className={t.deleted ? 'bg-gray-100 opacity-60' : ''}>
                                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{t.date}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'GASTO' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {t.type === 'GASTO' ? 'Gasto' : 'Ajuste'}
                                  </span>
                                </td>
                                <td className={`px-4 py-2 ${t.deleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.description}</td>
                                <td className={`px-4 py-2 text-right font-medium ${t.deleted ? 'text-gray-400 line-through' : 'text-red-600'}`}>-{formatCurrency(t.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">Selecciona una fecha para ver su registro.</p>
                )}
              </div>
              <div className="p-4 border-t text-right">
                <button onClick={() => setShowRegistro(false)} className="px-4 py-2 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition">
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
