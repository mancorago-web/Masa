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
    if (
      error.message?.includes("chunk") ||
      error.message?.includes("loading") ||
      error.message?.includes("ChunkLoadError")
    ) {
      location.reload();
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <div className="text-5xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Error de carga</h1>
        <p className="text-gray-600 mb-6">
          Hubo un problema al cargar la aplicación. Intenta recargar la página.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
