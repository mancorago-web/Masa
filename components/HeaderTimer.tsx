"use client";

import { useState, useEffect } from "react";

export default function HeaderTimer() {
  const [fechaHora, setFechaHora] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFechaHora(new Date());
    
    const timer = setInterval(() => {
      setFechaHora(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatearFecha = (fecha: Date) => {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return fecha.toLocaleDateString('es-ES', opciones);
  };

  if (!mounted || !fechaHora) {
    return <div className="text-sm">Cargando...</div>;
  }

  return (
    <div className="text-sm">
      {formatearFecha(fechaHora)}
    </div>
  );
}
