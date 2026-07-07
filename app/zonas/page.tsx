"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import ZonaDrawClient from "../components/ZonaDrawClient";
import type { LngLat } from "../components/ZonaDrawMap";
import { useAuth } from "../../lib/auth";
import { ApiError } from "../../lib/api";

type Zona = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  centroEducativoId: number | null;
  geojson: { type: "Polygon"; coordinates: number[][][] };
};

type Centro = { id: number; nombre: string };

const FORM_INICIAL = {
  nombre: "",
  descripcion: "",
  centroEducativoId: "",
};

function ZonasContent() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [puntos, setPuntos] = useState<LngLat[]>([]);
  const [avanzado, setAvanzado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = () => {
    authFetch("/zonas").then(setZonas).catch(console.error);
    authFetch("/centros-educativos").then(setCentros).catch(console.error);
  };

  useEffect(() => {
    cargar();
  }, []);

  // Permite pegar un anillo o un Polygon completo y verlo dibujado en el mapa.
  const cargarDesdeTexto = () => {
    setError(null);
    try {
      const parsed = JSON.parse(avanzado);
      const anillo: number[][] = Array.isArray(parsed?.[0]?.[0])
        ? parsed[0]
        : parsed;

      const puntosCargados = anillo.map((p) => [p[0], p[1]] as LngLat);

      // Quita el punto de cierre duplicado si el anillo viene cerrado
      const primero = puntosCargados[0];
      const ultimo = puntosCargados[puntosCargados.length - 1];
      if (
        puntosCargados.length > 1 &&
        primero[0] === ultimo[0] &&
        primero[1] === ultimo[1]
      ) {
        puntosCargados.pop();
      }

      setPuntos(puntosCargados);
    } catch {
      setError("El GeoJSON pegado no es válido");
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (puntos.length < 3) {
      setError("Marca al menos 3 puntos en el mapa para formar el área");
      return;
    }

    setCargando(true);

    try {
      // Cierra el anillo repitiendo el primer vértice (requisito de un Polygon)
      const anilloCerrado = [...puntos, puntos[0]];

      await authFetch("/zonas", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          centroEducativoId: form.centroEducativoId
            ? Number(form.centroEducativoId)
            : undefined,
          geojson: { type: "Polygon", coordinates: [anilloCerrado] },
        }),
      });
      setForm(FORM_INICIAL);
      setPuntos([]);
      setAvanzado("");
      cargar();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al crear zona");
      }
    } finally {
      setCargando(false);
    }
  };

  const desactivar = async (id: number) => {
    await authFetch(`/zonas/${id}`, { method: "DELETE" });
    cargar();
  };

  return (
    <main className="min-h-screen bg-[#020617] p-5 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-black">Gestionar Áreas de Monitoreo</h1>

        <form
          onSubmit={crear}
          className="grid gap-3 rounded-4xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:grid-cols-2"
        >
          <input
            required
            placeholder="Nombre de la zona"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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
          <input
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400 sm:col-span-2"
          />

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-slate-400">
                Dibuja el área en el mapa (haz clic en cada esquina)
              </label>
              <span className="text-xs text-slate-400">
                {puntos.length} punto(s)
              </span>
            </div>

            <div className="mt-2 h-96 overflow-hidden rounded-2xl border border-white/10">
              <ZonaDrawClient puntos={puntos} onPuntosChange={setPuntos} />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPuntos(puntos.slice(0, -1))}
                disabled={puntos.length === 0}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20 disabled:opacity-40"
              >
                Deshacer último punto
              </button>
              <button
                type="button"
                onClick={() => setPuntos([])}
                disabled={puntos.length === 0}
                className="rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-40"
              >
                Limpiar
              </button>
            </div>

            <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <summary className="cursor-pointer text-xs uppercase tracking-widest text-slate-400">
                Modo avanzado: pegar coordenadas GeoJSON
              </summary>
              <textarea
                rows={3}
                value={avanzado}
                onChange={(e) => setAvanzado(e.target.value)}
                placeholder="[[-63.1819,-17.7831],[-63.1812,-17.7831],[-63.1812,-17.7838]]"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={cargarDesdeTexto}
                className="mt-2 rounded-xl bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30"
              >
                Cargar en el mapa
              </button>
            </details>
          </div>

          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50 sm:col-span-2"
          >
            {cargando ? "Creando..." : "Crear zona"}
          </button>
        </form>

        <div className="overflow-hidden rounded-4xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Descripción</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {zonas.map((z) => (
                <tr key={z.id} className="border-t border-white/5">
                  <td className="px-5 py-3">{z.nombre}</td>
                  <td className="px-5 py-3 text-slate-300">
                    {z.descripcion ?? "-"}
                  </td>
                  <td className="px-5 py-3">
                    {z.activo ? (
                      <span className="text-green-400">Activa</span>
                    ) : (
                      <span className="text-red-400">Inactiva</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {z.activo && (
                        <button
                          onClick={() => router.push(`/?zona=${z.id}`)}
                          className="rounded-xl bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30"
                        >
                          Ver en mapa
                        </button>
                      )}
                      {z.activo && (
                        <button
                          onClick={() => desactivar(z.id)}
                          className="rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
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

export default function ZonasPage() {
  return (
    <AppShell>
      <ZonasContent />
    </AppShell>
  );
}
