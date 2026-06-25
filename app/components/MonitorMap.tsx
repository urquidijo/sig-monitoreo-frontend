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
import { point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { io, Socket } from "socket.io-client";
import { kinderPolygon } from "../data/kinderPolygon";
import PairingPanel from "./PairingPanel";

type Position = {
  lat: number;
  lng: number;
};

type BackendResponse = {
  ninoId: number;
  zonaId: number;
  latitud: number;
  longitud: number;
  dentroArea: boolean;
  alerta: unknown | null;
};

type DispositivoReal = {
  ninoId: number;
  nombreNino: string;
  lat: number | null;
  lng: number | null;
  dentroArea: boolean | null;
};

type PosicionUpdate = {
  ninoId: number;
  latitud: number;
  longitud: number;
  dentroArea: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const INITIAL_POSITION: Position = {
  lat: -17.791771,
  lng: -63.182385,
};

function RecenterMap({ position }: { position: Position }) {
  const map = useMap();

  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), {
      animate: true,
    });
  }, [position, map]);

  return null;
}

export default function MonitorMap() {
  const [position, setPosition] = useState<Position>(INITIAL_POSITION);
  const [inside, setInside] = useState(true);
  const [backendInside, setBackendInside] = useState<boolean | null>(null);
  const [lastMessage, setLastMessage] = useState(
    "Sistema iniciado correctamente.",
  );
  const [alertCount, setAlertCount] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const lastInsideRef = useRef(true);

  const [dispositivos, setDispositivos] = useState<
    Record<number, DispositivoReal>
  >({});
  const socketRef = useRef<Socket | null>(null);

  const childIcon = useMemo(() => {
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width: 42px;
          height: 42px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${inside ? "#22c55e" : "#ef4444"};
          border: 4px solid white;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.45);
          font-size: 22px;
          transform: translate(-4px, -4px);
        ">
          🧒
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  }, [inside]);

  const schoolIcon = useMemo(() => {
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width: 46px;
          height: 46px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2563eb;
          border: 4px solid white;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.45);
          font-size: 23px;
        ">
          🏫
        </div>
      `,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
    });
  }, []);

  const dispositivoIcon = (dentroArea: boolean | null) =>
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
          transform: translate(-4px, -4px);
        ">
          📱
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

  const handleVinculado = (data: { ninoId: number; nombreNino: string }) => {
    setDispositivos((prev) => ({
      ...prev,
      [data.ninoId]: {
        ninoId: data.ninoId,
        nombreNino: data.nombreNino,
        lat: null,
        lng: null,
        dentroArea: null,
      },
    }));

    socketRef.current?.emit("join-nino", { ninoId: data.ninoId });
  };

  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("posicion:update", (data: PosicionUpdate) => {
      setDispositivos((prev) => {
        if (!prev[data.ninoId]) return prev;

        return {
          ...prev,
          [data.ninoId]: {
            ...prev[data.ninoId],
            lat: data.latitud,
            lng: data.longitud,
            dentroArea: data.dentroArea,
          },
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const dispositivosFueraDeArea = Object.values(dispositivos).filter(
    (d) => d.dentroArea === false,
  );

  const sendPositionToBackend = async (newPosition: Position) => {
    try {
      const response = await fetch(`${API_URL}/monitoreo/posicion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ninoId: 1,
          zonaId: 1,
          latitud: newPosition.lat,
          longitud: newPosition.lng,
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar la posición al backend.");
      }

      const data = (await response.json()) as BackendResponse;
      setBackendInside(data.dentroArea);
    } catch (error) {
      console.error(error);
      setLastMessage("No se pudo conectar con el backend NestJS.");
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (!["w", "a", "s", "d"].includes(key)) return;

      const step = 0.00005;

      setPosition((prev) => {
        let lat = prev.lat;
        let lng = prev.lng;

        if (key === "w") lat += step;
        if (key === "s") lat -= step;
        if (key === "a") lng -= step;
        if (key === "d") lng += step;

        return { lat, lng };
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const childPoint = point([position.lng, position.lat]);
    const isInside = booleanPointInPolygon(childPoint, kinderPolygon);

    setInside(isInside);

    const time = new Date().toLocaleTimeString("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (isInside) {
      setLastMessage("El nino se encuentra dentro del área segura.");
    } else {
      setLastMessage("ALERTA: El nino salió del área segura del Kinder.");
    }

    if (lastInsideRef.current && !isInside) {
      setAlertCount((prev) => prev + 1);
      setHistory((prev) => [
        `${time} - Alerta: salida del área segura`,
        ...prev.slice(0, 5),
      ]);
    }

    if (!lastInsideRef.current && isInside) {
      setHistory((prev) => [
        `${time} - Retorno: el nino volvió al área segura`,
        ...prev.slice(0, 5),
      ]);
    }

    lastInsideRef.current = isInside;

    sendPositionToBackend(position);
  }, [position]);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.14),transparent_30%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-5 p-5">
        <header className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                Sistema de Información Geográfica
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight lg:text-4xl">
                Monitoreo Infantil en Tiempo Real
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Supervisión geoespacial del niño dentro del área segura del U.E.
                Colegio Cristo Rey mediante análisis espacial y alertas
                automáticas.
              </p>
            </div>

            <div
              className={`rounded-2xl px-5 py-4 text-center shadow-xl ${
                inside
                  ? "bg-green-500/20 ring-1 ring-green-300/40"
                  : "bg-red-500/25 ring-1 ring-red-300/50"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.25em] text-slate-200">
                Estado actual
              </p>

              <div className="mt-2 flex items-center justify-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    inside ? "bg-green-400" : "animate-pulse bg-red-400"
                  }`}
                />

                <p className="text-lg font-black">
                  {inside ? "Zona segura" : "Alerta activa"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <div
              className={`rounded-4xl border p-5 shadow-2xl backdrop-blur-xl ${
                inside
                  ? "border-green-400/30 bg-green-500/10"
                  : "border-red-400/40 bg-red-500/15"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Niño monitoreado</p>
                  <h2 className="mt-1 text-2xl font-black">Niño Demo</h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-xl">
                  🧒
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">
                  Resultado del monitoreo
                </p>
                <p className="mt-1 text-base font-semibold text-slate-100">
                  {lastMessage}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Latitud
                  </p>
                  <p className="mt-2 font-mono text-sm font-bold">
                    {position.lat.toFixed(6)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Longitud
                  </p>
                  <p className="mt-2 font-mono text-sm font-bold">
                    {position.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Validación espacial</p>
                  <h2 className="mt-1 text-xl font-black">PostGIS</h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/20 text-2xl">
                  🛰️
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950/50 p-4">
                <p className="text-sm font-semibold">
                  {backendInside === null
                    ? "Esperando respuesta del servidor..."
                    : backendInside
                      ? "El punto se encuentra dentro del polígono."
                      : "El punto se encuentra fuera del polígono."}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  La verificación se realiza usando la geometría almacenada en
                  PostgreSQL/PostGIS.
                </p>
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Registro de eventos</p>
                  <h2 className="mt-1 text-xl font-black">Historial</h2>
                </div>

                <span className="rounded-full bg-red-500 px-4 py-2 text-sm font-black shadow-lg">
                  {alertCount}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {history.length === 0 ? (
                  <div className="rounded-2xl bg-slate-950/50 p-4 text-sm text-slate-400">
                    No se registraron alertas durante el monitoreo actual.
                  </div>
                ) : (
                  history.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 text-sm text-slate-200"
                    >
                      {item}
                    </div>
                  ))
                )}
              </div>
            </div>

            <PairingPanel onVinculado={handleVinculado} />
          </aside>

          <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
            {!inside && (
              <div className="absolute left-6 right-6 top-6 z-999 rounded-2xl border border-red-200/40 bg-red-500/95 px-6 py-4 text-center text-lg font-black shadow-2xl">
                🚨 Alerta: el niño salió del área segura del Colegio Cristo Rey
              </div>
            )}

            {dispositivosFueraDeArea.map((dispositivo) => (
              <div
                key={dispositivo.ninoId}
                className="absolute left-6 right-6 top-24 z-999 rounded-2xl border border-purple-200/40 bg-purple-600/95 px-6 py-4 text-center text-lg font-black shadow-2xl"
              >
                🚨 Alerta: {dispositivo.nombreNino} (dispositivo real) salió del
                área segura
              </div>
            ))}

            <div className="absolute bottom-6 left-6 z-999 rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 shadow-2xl backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Área monitoreada
              </p>
              <p className="mt-1 font-bold text-white">
                U.E. Colegio Cristo Rey
              </p>
            </div>

            <div className="h-[calc(100vh-190px)] min-h-162.5 overflow-hidden rounded-3xl">
              <MapContainer
                center={[position.lat, position.lng]}
                zoom={18}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <GeoJSON
                  data={kinderPolygon}
                  style={{
                    color: inside ? "#22c55e" : "#ef4444",
                    weight: 4,
                    fillColor: inside ? "#22c55e" : "#ef4444",
                    fillOpacity: 0.28,
                  }}
                />

                <Marker position={[-17.791771, -63.182385]} icon={schoolIcon}>
                  <Popup>U.E. Colegio Cristo Rey - Área segura</Popup>
                </Marker>

                <Marker
                  position={[position.lat, position.lng]}
                  icon={childIcon}
                >
                  <Popup>
                    Niño monitoreado
                    <br />
                    Lat: {position.lat.toFixed(6)}
                    <br />
                    Lng: {position.lng.toFixed(6)}
                  </Popup>
                </Marker>

                {Object.values(dispositivos)
                  .filter((d) => d.lat !== null && d.lng !== null)
                  .map((dispositivo) => (
                    <Marker
                      key={dispositivo.ninoId}
                      position={[dispositivo.lat as number, dispositivo.lng as number]}
                      icon={dispositivoIcon(dispositivo.dentroArea)}
                    >
                      <Popup>
                        {dispositivo.nombreNino} (dispositivo real)
                        <br />
                        Lat: {dispositivo.lat?.toFixed(6)}
                        <br />
                        Lng: {dispositivo.lng?.toFixed(6)}
                        <br />
                        {dispositivo.dentroArea === false
                          ? "Fuera del área segura"
                          : "Dentro del área segura"}
                      </Popup>
                    </Marker>
                  ))}

                <RecenterMap position={position} />
              </MapContainer>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
