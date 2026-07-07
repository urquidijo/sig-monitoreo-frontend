"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import PairingPanel from "./PairingPanel";
import { useAuth } from "../../lib/auth";

type NinoMonitor = {
  ninoId: number;
  nombreNino: string;
  lat: number | null;
  lng: number | null;
  dentroArea: boolean | null;
  vinculado: boolean;
  enLinea: boolean;
  ultimaConexion: string | null;
  ultimaSenal: string | null;
};

type PanelNino = {
  id: number;
  nombre: string;
  ultimaPosicion: {
    latitud: number;
    longitud: number;
    dentroArea: boolean;
    createdAt: string;
  } | null;
  dispositivo: { vinculado: boolean; ultimaConexion: string | null };
  enLinea: boolean;
};

type PosicionUpdate = {
  ninoId: number;
  latitud: number;
  longitud: number;
  dentroArea: boolean;
};

type PresenciaUpdate = { ninoId: number; enLinea: boolean };

type Zona = {
  id: number;
  nombre: string;
  activo: boolean;
  geojson: { type: "Polygon"; coordinates: number[][][] };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CENTRO_MAPA: [number, number] = [-17.791771, -63.182385];

function haceCuanto(iso: string | null): string {
  if (!iso) return "nunca";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const dispositivoIcon = (dentroArea: boolean | null, enLinea: boolean) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${dentroArea === false ? "#ef4444" : "#a855f7"};
        border: 4px solid white;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.45);
        font-size: 20px;
        opacity: ${enLinea ? 1 : 0.45};
        transform: translate(-4px, -4px);
      ">
        📱
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

// Hace zoom automático al polígono de la zona indicada en la URL (?zona=ID)
function EnfocarZona({
  zonas,
  zonaId,
}: {
  zonas: Zona[];
  zonaId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!zonaId) return;

    const zona = zonas.find((z) => String(z.id) === zonaId);
    if (!zona?.geojson?.coordinates?.[0]?.length) return;

    // GeoJSON viene en [lng, lat]; Leaflet necesita [lat, lng]
    const puntos = zona.geojson.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );

    map.fitBounds(puntos, { maxZoom: 18, padding: [40, 40] });
  }, [zonaId, zonas, map]);

  return null;
}

export default function MonitorMap() {
  const { token, authFetch } = useAuth();
  const searchParams = useSearchParams();
  const zonaEnfocada = searchParams.get("zona");
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [ninos, setNinos] = useState<Record<number, NinoMonitor>>({});
  const [socketListo, setSocketListo] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const handleVinculado = (data: { ninoId: number; nombreNino: string }) => {
    setNinos((prev) => ({
      ...prev,
      [data.ninoId]: {
        ninoId: data.ninoId,
        nombreNino: data.nombreNino,
        lat: prev[data.ninoId]?.lat ?? null,
        lng: prev[data.ninoId]?.lng ?? null,
        dentroArea: prev[data.ninoId]?.dentroArea ?? null,
        vinculado: true,
        enLinea: prev[data.ninoId]?.enLinea ?? false,
        ultimaConexion: prev[data.ninoId]?.ultimaConexion ?? null,
        ultimaSenal: prev[data.ninoId]?.ultimaSenal ?? null,
      },
    }));

    socketRef.current?.emit("join-nino", { ninoId: data.ninoId });
  };

  // Carga inicial: zonas + panel (todos los niños con su última posición y estado)
  useEffect(() => {
    authFetch("/zonas")
      .then((data: Zona[]) => setZonas(data))
      .catch(console.error);

    authFetch("/monitoreo/panel")
      .then((data: PanelNino[]) => {
        const mapa: Record<number, NinoMonitor> = {};
        for (const p of data) {
          mapa[p.id] = {
            ninoId: p.id,
            nombreNino: p.nombre,
            lat: p.ultimaPosicion?.latitud ?? null,
            lng: p.ultimaPosicion?.longitud ?? null,
            dentroArea: p.ultimaPosicion?.dentroArea ?? null,
            vinculado: p.dispositivo.vinculado,
            enLinea: p.enLinea,
            ultimaConexion: p.dispositivo.ultimaConexion,
            ultimaSenal: p.ultimaPosicion?.createdAt ?? null,
          };
        }
        setNinos(mapa);
      })
      .catch(console.error);
  }, []);

  // Socket en vivo
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket"],
      auth: { jwt: token },
    });
    socketRef.current = socket;

    socket.on("auth:ok", () => setSocketListo(true));

    socket.on("posicion:update", (data: PosicionUpdate) => {
      setNinos((prev) => {
        const actual = prev[data.ninoId];
        return {
          ...prev,
          [data.ninoId]: {
            ...(actual ?? {
              ninoId: data.ninoId,
              nombreNino: `Niño ${data.ninoId}`,
              vinculado: true,
              ultimaConexion: null,
            }),
            lat: data.latitud,
            lng: data.longitud,
            dentroArea: data.dentroArea,
            enLinea: true,
            ultimaSenal: new Date().toISOString(),
          } as NinoMonitor,
        };
      });
    });

    socket.on("presencia:update", (data: PresenciaUpdate) => {
      setNinos((prev) => {
        if (!prev[data.ninoId]) return prev;
        return {
          ...prev,
          [data.ninoId]: { ...prev[data.ninoId], enLinea: data.enLinea },
        };
      });
    });

    return () => {
      socket.disconnect();
      setSocketListo(false);
    };
  }, [token]);

  const idsKey = Object.keys(ninos).sort().join(",");

  // Unirse a la sala de cada niño cuando el socket esté listo o cambie la lista
  useEffect(() => {
    if (!socketListo) return;
    for (const id of Object.keys(ninos)) {
      socketRef.current?.emit("join-nino", { ninoId: Number(id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketListo, idsKey]);

  const listaNinos = useMemo(
    () => Object.values(ninos).sort((a, b) => a.ninoId - b.ninoId),
    [ninos],
  );

  const enLineaCount = listaNinos.filter((n) => n.enLinea).length;
  const ninosFueraDeArea = listaNinos.filter((n) => n.dentroArea === false);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.14),transparent_30%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-5 p-5">
        <header className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Sistema de Información Geográfica
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight lg:text-4xl">
            Monitoreo Infantil en Tiempo Real
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Supervisión geoespacial de los dispositivos vinculados dentro de
            las áreas de monitoreo registradas, con alertas automáticas al
            salir de zona.
          </p>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">En línea ahora</p>
                  <h2 className="mt-1 text-2xl font-black">
                    {enLineaCount}
                    <span className="text-base font-medium text-slate-400">
                      {" "}
                      / {listaNinos.length} niños
                    </span>
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-xl">
                  📱
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950/50 p-4 text-sm text-slate-300">
                {zonas.filter((z) => z.activo).length} área(s) de monitoreo
                activa(s).
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <p className="text-sm font-semibold text-slate-200">Niños</p>
              <ul className="mt-3 space-y-2">
                {listaNinos.length === 0 && (
                  <li className="text-sm text-slate-400">
                    No hay niños registrados.
                  </li>
                )}
                {listaNinos.map((n) => {
                  const estado = !n.vinculado
                    ? { dot: "bg-slate-500", txt: "Sin celular vinculado" }
                    : n.enLinea
                      ? { dot: "bg-green-400", txt: "En línea" }
                      : {
                          dot: "bg-amber-400",
                          txt: `Sin señal · ${haceCuanto(
                            n.ultimaSenal ?? n.ultimaConexion,
                          )}`,
                        };

                  return (
                    <li
                      key={n.ninoId}
                      className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${estado.dot}`}
                        />
                        <div>
                          <p className="text-sm font-semibold">
                            {n.nombreNino}
                          </p>
                          <p className="text-xs text-slate-400">{estado.txt}</p>
                        </div>
                      </div>
                      {n.dentroArea === false && (
                        <span className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-bold text-red-300">
                          Fuera
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <PairingPanel onVinculado={handleVinculado} />
          </aside>

          <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
            {ninosFueraDeArea.map((nino) => (
              <div
                key={nino.ninoId}
                className="absolute left-6 right-6 top-6 z-999 rounded-2xl border border-red-200/40 bg-red-500/95 px-6 py-4 text-center text-lg font-black shadow-2xl"
              >
                🚨 Alerta: {nino.nombreNino} salió del área segura
              </div>
            ))}

            <div className="h-[calc(100vh-190px)] min-h-162.5 overflow-hidden rounded-3xl">
              <MapContainer
                center={CENTRO_MAPA}
                zoom={17}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <EnfocarZona zonas={zonas} zonaId={zonaEnfocada} />

                {zonas
                  .filter((z) => z.activo)
                  .map((zona) => {
                    const enfocada = String(zona.id) === zonaEnfocada;
                    return (
                      <GeoJSON
                        // key incluye el estado enfocado para forzar el
                        // re-render del estilo al cambiar la zona seleccionada
                        key={`${zona.id}-${enfocada}`}
                        data={zona.geojson as any}
                        style={{
                          color: enfocada ? "#06b6d4" : "#22c55e",
                          weight: enfocada ? 4 : 3,
                          fillColor: enfocada ? "#06b6d4" : "#22c55e",
                          fillOpacity: enfocada ? 0.35 : 0.2,
                        }}
                      >
                        <Popup>{zona.nombre}</Popup>
                      </GeoJSON>
                    );
                  })}

                {listaNinos
                  .filter((n) => n.lat !== null && n.lng !== null)
                  .map((nino) => (
                    <Marker
                      key={nino.ninoId}
                      position={[nino.lat as number, nino.lng as number]}
                      icon={dispositivoIcon(nino.dentroArea, nino.enLinea)}
                    >
                      <Popup>
                        <b>{nino.nombreNino}</b>
                        <br />
                        {nino.enLinea ? "🟢 En línea" : "🟡 Sin señal"}
                        <br />
                        Lat: {nino.lat?.toFixed(6)}
                        <br />
                        Lng: {nino.lng?.toFixed(6)}
                        <br />
                        {nino.dentroArea === false
                          ? "Fuera del área segura"
                          : "Dentro del área segura"}
                        <br />
                        <span style={{ color: "#64748b" }}>
                          Última señal: {haceCuanto(nino.ultimaSenal)}
                        </span>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
