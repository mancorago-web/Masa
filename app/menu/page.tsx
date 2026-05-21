"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Menu() {
  const router = useRouter();
  const rol = "admin"; // Modo local: asumimos rol admin

  const cerrarSesion = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <header 
        className="text-green-900 p-3 md:p-4 shadow-lg"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #16a34a 25%, transparent 25%),
            linear-gradient(-45deg, #16a34a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #16a34a 75%),
            linear-gradient(-45deg, transparent 75%, #16a34a 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundColor: '#ffffff',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/icons/masa2.jpeg" alt="MASA" className="w-10 h-10 md:w-12 md:h-12" />
            <span className="bg-white px-3 py-1 rounded-lg shadow">
              <h1 className="text-lg md:text-2xl font-bold text-green-900">
                MASA
              </h1>
            </span>
          </div>
          <button 
            onClick={cerrarSesion}
            className="bg-green-500 text-white px-3 py-2 md:px-4 md:py-2 rounded hover:bg-green-600 text-sm md:text-base"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="container mx-auto p-3 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <Link href="/inventario" className="block">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">📦 Inventario</h2>
              <p className="text-gray-600 text-sm">Control de ingredientes, recetas y masa</p>
            </div>
          </Link>

          <Link href="/caja" className="block">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">💰 Caja Chica</h2>
              <p className="text-gray-600 text-sm">Gestión de efectivo y gastos</p>
            </div>
          </Link>

          <Link href="/ventas" className="block">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">🍕 Ventas</h2>
              <p className="text-gray-600 text-sm">Salón y delivery</p>
            </div>
          </Link>

          <Link href="/dashboard" className="block">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">📊 Dashboard</h2>
              <p className="text-gray-600 text-sm">Ventas en tiempo real</p>
            </div>
          </Link>

          <Link href="/facturas" className="block">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">🧾 Facturas</h2>
              <p className="text-gray-600 text-sm">Facturas y comprobantes</p>
            </div>
          </Link>

          <Link href="/planillas" className="block">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">📋 Planillas</h2>
              <p className="text-gray-600 text-sm">Control de colaboradores</p>
            </div>
          </Link>

          <Link href="/gestion-usuarios" className="block">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">👥 Usuarios</h2>
              <p className="text-gray-600 text-sm">Gestión de usuarios</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
