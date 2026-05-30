"use client";

import { useEffect, useState } from "react";

type MonitorMapComponent = React.ComponentType;

export default function MapClient() {
  const [MonitorMap, setMonitorMap] = useState<MonitorMapComponent | null>(null);

  useEffect(() => {
    import("./MonitorMap").then((mod) => {
      setMonitorMap(() => mod.default);
    });
  }, []);

  if (!MonitorMap) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
            Cargando SIG
          </p>
          <h1 className="mt-3 text-3xl font-black">Preparando mapa...</h1>
        </div>
      </main>
    );
  }

  return <MonitorMap />;
}