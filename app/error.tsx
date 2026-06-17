"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error.message, error.digest);
    // Auto-reload after 4s with cache-busting
    const t = setTimeout(() => { location.href = location.pathname + '?t=' + Date.now(); }, 4000);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <div className="text-5xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Error de carga</h1>
        <p className="text-gray-600 mb-4">
          Hubo un problema al cargar la aplicación.
        </p>
        <p className="text-sm text-red-600 mb-6 bg-red-50 rounded p-2 break-words">
          {error.message}
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
        >
          Reintentar ahora
        </button>
      </div>
    </div>
  );
}
