"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Caja() {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto">
        <Link href="/menu" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Volver al menú
        </Link>
        <h1 className="text-2xl font-bold mb-4">💰 Caja Chica</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-600">Aquí se gestionará el flujo de caja, gastos y efectivo.</p>
        </div>
      </div>
    </main>
  );
}
