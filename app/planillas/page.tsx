"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function Planillas() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  if (authLoading) return <main className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Cargando...</p></main>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto">
        <Link href="/menu" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Volver al menú
        </Link>
        <h1 className="text-2xl font-bold mb-4">📋 Planillas</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-600">Control de horarios y colaboradores de la pizzería.</p>
        </div>
      </div>
    </main>
  );
}
