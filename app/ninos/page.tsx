"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../../lib/auth";
import { ApiError } from "../../lib/api";

type Nino = {
  id: number;
  nombre: string;
  edad: number | null;
  activo: boolean;
  tutor: { id: number; nombre: string } | null;
  centroEducativo: { id: number; nombre: string } | null;
};

type Centro = { id: number; nombre: string };

const FORM_INICIAL = { nombre: "", edad: "", centroEducativoId: "" };

function NinosContent() {
  const { authFetch } = useAuth();
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState<{
    ninoNombre: string;
    codigo: string;
    expiresAt: string;
  } | null>(null);

  const cargar = () => {
    authFetch("/ninos").then(setNinos).catch(console.error);
    authFetch("/centros-educativos").then(setCentros).catch(console.error);
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      await authFetch("/ninos", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre,
          edad: form.edad ? Number(form.edad) : undefined,
          centroEducativoId: form.centroEducativoId
            ? Number(form.centroEducativoId)
            : undefined,
        }),
      });
      setForm(FORM_INICIAL);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear niño");
    } finally {
      setCargando(false);
    }
  };

  const desactivar = async (id: number) => {
    await authFetch(`/ninos/${id}`, { method: "DELETE" });
    cargar();
  };

  const generarCodigo = async (nino: Nino) => {
    const data = await authFetch(`/ninos/${nino.id}/codigo-afiliacion`, {
      method: "POST",
    });
    setCodigoGenerado({
      ninoNombre: nino.nombre,
      codigo: data.codigo,
      expiresAt: data.expiresAt,
    });
  };

  return (
      <main className="min-h-screen bg-[#020617] p-5 text-white">
        <div className="mx-auto max-w-5xl space-y-6">
          <h1 className="text-3xl font-black">Gestionar Niños</h1>

          <form
            onSubmit={crear}
            className="grid gap-3 rounded-4xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:grid-cols-3"
          >
            <input
              required
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            />
            <input
              type="number"
              min={0}
              placeholder="Edad"
              value={form.edad}
              onChange={(e) => setForm({ ...form, edad: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            />
            <select
              value={form.centroEducativoId}
              onChange={(e) =>
                setForm({ ...form, centroEducativoId: e.target.value })
              }
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            >
              <option value="">Sin centro educativo</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {error && <p className="text-sm text-red-400 sm:col-span-3">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50 sm:col-span-3"
            >
              {cargando ? "Creando..." : "Crear niño"}
            </button>
          </form>

          {codigoGenerado && (
            <div className="rounded-4xl border border-cyan-400/30 bg-cyan-500/10 p-6 shadow-2xl backdrop-blur-xl">
              <p className="text-sm text-slate-300">
                Código de afiliación para <b>{codigoGenerado.ninoNombre}</b>{" "}
                (compártelo con el tutor para que lo ingrese en la app móvil):
              </p>
              <p className="mt-2 font-mono text-3xl font-black tracking-widest text-cyan-300">
                {codigoGenerado.codigo}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Expira: {new Date(codigoGenerado.expiresAt).toLocaleString("es-BO")}
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-4xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Edad</th>
                  <th className="px-5 py-3">Tutor</th>
                  <th className="px-5 py-3">Centro</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ninos.map((n) => (
                  <tr key={n.id} className="border-t border-white/5">
                    <td className="px-5 py-3">{n.nombre}</td>
                    <td className="px-5 py-3 text-slate-300">{n.edad ?? "-"}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {n.tutor?.nombre ?? "Sin afiliar"}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {n.centroEducativo?.nombre ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      {n.activo ? (
                        <span className="text-green-400">Activo</span>
                      ) : (
                        <span className="text-red-400">Inactivo</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        onClick={() => generarCodigo(n)}
                        className="rounded-xl bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                      >
                        Generar código
                      </button>
                      {n.activo && (
                        <button
                          onClick={() => desactivar(n.id)}
                          className="rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
  );
}

export default function NinosPage() {
  return (
    <AppShell>
      <NinosContent />
    </AppShell>
  );
}
