"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { hasAccess, ROLE_LABELS } from "@/lib/auth";

const menuItems = [
  { key: "inventario", href: "/inventario", label: "Inventario", desc: "Control de ingredientes, recetas y masa", emoji: "📦" },
  { key: "caja", href: "/caja", label: "Caja Chica", desc: "Gestión de efectivo y gastos", emoji: "💰" },
  { key: "ventas", href: "/ventas", label: "Ventas", desc: "Salón y delivery", emoji: "🍕" },
  { key: "cocina", href: "/cocina", label: "Cocina", desc: "Pedidos en tiempo real", emoji: "👨‍🍳" },
  { key: "dashboard", href: "/dashboard", label: "Dashboard", desc: "Ventas en tiempo real", emoji: "📊" },
  { key: "facturas", href: "/facturas", label: "Facturas", desc: "Facturas y comprobantes", emoji: "🧾" },
  { key: "planillas", href: "/planillas", label: "Planillas", desc: "Control de colaboradores", emoji: "📋" },
  { key: "usuarios", href: "/gestion-usuarios", label: "Usuarios", desc: "Gestión de usuarios", emoji: "👥" },
];

export default function Menu() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const cerrarSesion = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const visibleItems = menuItems.filter((item) => hasAccess(user, item.key));

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
          backgroundSize: "20px 20px",
          backgroundColor: "#ffffff",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/icons/masa2.jpeg" alt="MASA" className="w-10 h-10 md:w-12 md:h-12" />
            <span className="bg-white px-3 py-1 rounded-lg shadow">
              <h1 className="text-lg md:text-2xl font-bold text-green-900">MASA</h1>
            </span>
            <span className="text-sm text-green-800 bg-white/60 px-2 py-0.5 rounded">
              {user.name} · {ROLE_LABELS[user.role]}
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
          {visibleItems.map((item) => (
            <Link key={item.key} href={item.href} className="block">
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500 h-full">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">
                  {item.emoji} {item.label}
                </h2>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
