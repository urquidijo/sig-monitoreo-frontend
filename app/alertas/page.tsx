"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../../lib/auth";

type Alerta = {
  id: number;
  ninoId: number;
  estado: "NORMAL" | "FUERA_AREA";
  mensaje: string;
  latitud: number;
  longitud: number;
  atendida: boolean;
  createdAt: string;
  nino: { id: number; nombre: string };
};

function AlertasContent() {
  const { authFetch } = useAuth();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [soloPendientes, setSoloPendientes] = useState(true);

  const cargar = () => {
    const query = soloPendientes ? "?atendida=false" : "";
    authFetch(`/alertas${query}`).then(setAlertas).catch(console.error);
  };

  useEffect(() => {
    cargar();
  }, [soloPendientes]);

  const marcarAtendida = async (id: number) => {
    await authFetch(`/alertas/${id}/atender`, { method: "PATCH" });
    cargar();
  };

  return (
      <main className="min-h-screen bg-[#020617] p-5 text-white">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black">Gestionar Alertas</h1>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => setSoloPendientes(e.target.checked)}
              />
              Solo pendientes
            </label>
          </div>

          <div className="overflow-hidden rounded-4xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-3">Niño</th>
                  <th className="px-5 py-3">Mensaje</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((a) => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="px-5 py-3">{a.nino.nombre}</td>
                    <td className="px-5 py-3 text-slate-300">{a.mensaje}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(a.createdAt).toLocaleString("es-BO")}
                    </td>
                    <td className="px-5 py-3">
                      {a.atendida ? (
                        <span className="text-green-400">Atendida</span>
                      ) : (
                        <span className="text-red-400">Pendiente</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!a.atendida && (
                        <button
                          onClick={() => marcarAtendida(a.id)}
                          className="rounded-xl bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                        >
                          Marcar atendida
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {alertas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                      No hay alertas para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
  );
}

export default function AlertasPage() {
  return (
    <AppShell>
      <AlertasContent />
    </AppShell>
  );
}
