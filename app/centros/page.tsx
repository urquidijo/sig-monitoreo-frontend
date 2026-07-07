"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import ZonaDrawClient from "../components/ZonaDrawClient";
import type { LngLat } from "../components/ZonaDrawMap";
import { useAuth } from "../../lib/auth";
import { ApiError } from "../../lib/api";

type Centro = {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
};

type Zona = {
  id: number;
  nombre: string;
  activo: boolean;
  centroEducativoId: number | null;
};

const FORM_INICIAL = { nombre: "", direccion: "", telefono: "" };

// Panel de zonas de un centro: lista sus zonas y permite agregar una nueva
// dibujándola en el mapa, con el centro ya preseleccionado.
function ZonasDeCentro({
  centroId,
  zonas,
  onCambio,
}: {
  centroId: number;
  zonas: Zona[];
  onCambio: () => void;
}) {
  const { authFetch } = useAuth();
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [puntos, setPuntos] = useState<LngLat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const crear = async () => {
    setError(null);

    if (!nombre.trim()) {
      setError("Ponle un nombre a la zona");
      return;
    }
    if (puntos.length < 3) {
      setError("Marca al menos 3 puntos en el mapa para formar el área");
      return;
    }

    setCargando(true);

    try {
      const anilloCerrado = [...puntos, puntos[0]];

      await authFetch("/zonas", {
        method: "POST",
        body: JSON.stringify({
          nombre,
          centroEducativoId: centroId,
          geojson: { type: "Polygon", coordinates: [anilloCerrado] },
        }),
      });

      setNombre("");
      setPuntos([]);
      setMostrarForm(false);
      onCambio();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear zona");
    } finally {
      setCargando(false);
    }
  };

  const desactivar = async (id: number) => {
    await authFetch(`/zonas/${id}`, { method: "DELETE" });
    onCambio();
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-950/40 p-4">
      {zonas.length === 0 ? (
        <p className="text-sm text-slate-400">
          Este centro todavía no tiene áreas de monitoreo.
        </p>
      ) : (
        <ul className="space-y-2">
          {zonas.map((z) => (
            <li
              key={z.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
            >
              <span>
                {z.nombre}{" "}
                <span
                  className={z.activo ? "text-green-400" : "text-red-400"}
                >
                  ({z.activo ? "activa" : "inactiva"})
                </span>
              </span>
              {z.activo && (
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/?zona=${z.id}`)}
                    className="rounded-lg bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30"
                  >
                    Ver en mapa
                  </button>
                  <button
                    onClick={() => desactivar(z.id)}
                    className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                  >
                    Desactivar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!mostrarForm ? (
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/30"
        >
          + Agregar zona
        </button>
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <input
            placeholder="Nombre de la zona"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              Dibuja el área en el mapa (haz clic en cada esquina)
            </span>
            <span className="text-xs text-slate-400">
              {puntos.length} punto(s)
            </span>
          </div>

          <div className="h-80 overflow-hidden rounded-2xl border border-white/10">
            <ZonaDrawClient puntos={puntos} onPuntosChange={setPuntos} />
          </div>

          <div className="flex flex-wrap gap-2">
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={crear}
              disabled={cargando}
              className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {cargando ? "Creando..." : "Guardar zona"}
            </button>
            <button
              onClick={() => {
                setMostrarForm(false);
                setPuntos([]);
                setNombre("");
                setError(null);
              }}
              className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/20"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CentrosContent() {
  const { authFetch } = useAuth();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [centroAbierto, setCentroAbierto] = useState<number | null>(null);

  const cargar = () => {
    authFetch("/centros-educativos").then(setCentros).catch(console.error);
    authFetch("/zonas").then(setZonas).catch(console.error);
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      await authFetch("/centros-educativos", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(FORM_INICIAL);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear centro");
    } finally {
      setCargando(false);
    }
  };

  const desactivar = async (id: number) => {
    await authFetch(`/centros-educativos/${id}`, { method: "DELETE" });
    cargar();
  };

  const zonasDe = (centroId: number) =>
    zonas.filter((z) => z.centroEducativoId === centroId);

  return (
    <main className="min-h-screen bg-[#020617] p-5 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-black">Gestionar Centros Educativos</h1>

        <form
          onSubmit={crear}
          className="grid gap-3 rounded-4xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:grid-cols-2"
        >
          <input
            required
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400 sm:col-span-2"
          />
          <input
            placeholder="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
          />
          <input
            placeholder="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
          />

          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50 sm:col-span-2"
          >
            {cargando ? "Creando..." : "Crear centro"}
          </button>
        </form>

        <div className="overflow-hidden rounded-4xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Dirección</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Zonas</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {centros.map((c) => {
                const abierto = centroAbierto === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="border-t border-white/5">
                      <td className="px-5 py-3">{c.nombre}</td>
                      <td className="px-5 py-3 text-slate-300">
                        {c.direccion ?? "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {c.telefono ?? "-"}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() =>
                            setCentroAbierto(abierto ? null : c.id)
                          }
                          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20"
                        >
                          {abierto ? "Ocultar" : "Ver zonas"} (
                          {zonasDe(c.id).length})
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        {c.activo ? (
                          <span className="text-green-400">Activo</span>
                        ) : (
                          <span className="text-red-400">Inactivo</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {c.activo && (
                          <button
                            onClick={() => desactivar(c.id)}
                            className="rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                          >
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="border-t border-white/5 bg-slate-950/30">
                        <td colSpan={6} className="px-5 py-4">
                          <ZonasDeCentro
                            centroId={c.id}
                            zonas={zonasDe(c.id)}
                            onCambio={cargar}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default function CentrosPage() {
  return (
    <AppShell>
      <CentrosContent />
    </AppShell>
  );
}
