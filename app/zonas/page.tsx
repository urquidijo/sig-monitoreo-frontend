"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
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

const EJEMPLO_COORDS = `[[[-63.1819,-17.7831],[-63.1812,-17.7831],[-63.1812,-17.7838],[-63.1819,-17.7838],[-63.1819,-17.7831]]]`;

const FORM_INICIAL = {
  nombre: "",
  descripcion: "",
  centroEducativoId: "",
  coordenadas: EJEMPLO_COORDS,
};

function ZonasContent() {
  const { authFetch } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = () => {
    authFetch("/zonas").then(setZonas).catch(console.error);
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
      const coordinates = JSON.parse(form.coordenadas);

      await authFetch("/zonas", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          centroEducativoId: form.centroEducativoId
            ? Number(form.centroEducativoId)
            : undefined,
          geojson: { type: "Polygon", coordinates },
        }),
      });
      setForm(FORM_INICIAL);
      cargar();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof SyntaxError) {
        setError("Las coordenadas no son un JSON válido");
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
              <label className="text-xs uppercase tracking-widest text-slate-400">
                Coordenadas del polígono (GeoJSON, [lng, lat], anillo cerrado)
              </label>
              <textarea
                required
                rows={3}
                value={form.coordenadas}
                onChange={(e) => setForm({ ...form, coordenadas: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-400"
              />
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
                    <td className="px-5 py-3 text-slate-300">{z.descripcion ?? "-"}</td>
                    <td className="px-5 py-3">
                      {z.activo ? (
                        <span className="text-green-400">Activa</span>
                      ) : (
                        <span className="text-red-400">Inactiva</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {z.activo && (
                        <button
                          onClick={() => desactivar(z.id)}
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

export default function ZonasPage() {
  return (
    <AppShell>
      <ZonasContent />
    </AppShell>
  );
}
