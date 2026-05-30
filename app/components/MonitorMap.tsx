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
import { kinderPolygon } from "../data/kinderPolygon";

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
    <main className="min-h-screen bg-slate-950 p-5 text-white">
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              SIG Monitoreo Infantil
            </p>

            <h1 className="mt-3 text-3xl font-black leading-tight">
              Panel de seguimiento en tiempo real
            </h1>

            <p className="mt-3 text-sm text-slate-300">
              Usa las teclas W, A, S y D para mover la ubicación simulada del
              nino.
            </p>
          </div>

          <div
            className={`rounded-3xl border p-5 shadow-2xl ${
              inside
                ? "border-green-400/40 bg-green-500/15"
                : "border-red-400/50 bg-red-500/20"
            }`}
          >
            <p className="text-sm text-slate-300">Estado actual</p>

            <div className="mt-2 flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full ${
                  inside ? "bg-green-400" : "animate-pulse bg-red-400"
                }`}
              />

              <h2 className="text-xl font-bold">
                {inside ? "Dentro del área segura" : "Fuera del área segura"}
              </h2>
            </div>

            <p className="mt-3 text-sm text-slate-200">{lastMessage}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-950/50 p-3">
                <p className="text-slate-400">Latitud</p>
                <p className="font-mono">{position.lat.toFixed(6)}</p>
              </div>

              <div className="rounded-2xl bg-slate-950/50 p-3">
                <p className="text-slate-400">Longitud</p>
                <p className="font-mono">{position.lng.toFixed(6)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-slate-950/50 p-3 text-sm">
              <p className="text-slate-400">Validación backend</p>
              <p className="font-semibold">
                {backendInside === null
                  ? "Esperando respuesta..."
                  : backendInside
                    ? "PostGIS: dentro del polígono"
                    : "PostGIS: fuera del polígono"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Eventos</h2>
              <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold">
                {alertCount} alertas
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Todavía no se registraron eventos.
                </p>
              ) : (
                history.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="rounded-2xl bg-slate-950/50 p-3 text-sm text-slate-200"
                  >
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-bold">Controles</h2>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm font-bold">
              <div />
              <kbd className="rounded-xl bg-slate-800 p-3">W</kbd>
              <div />
              <kbd className="rounded-xl bg-slate-800 p-3">A</kbd>
              <kbd className="rounded-xl bg-slate-800 p-3">S</kbd>
              <kbd className="rounded-xl bg-slate-800 p-3">D</kbd>
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur">
          {!inside && (
            <div className="mb-3 rounded-2xl border border-red-300/40 bg-red-500 px-5 py-4 text-center font-black shadow-xl">
              🚨 ALERTA: el nino salió del área segura del Kinder
            </div>
          )}

          <div className="h-[calc(100vh-64px)] min-h-155 overflow-hidden rounded-2xl">
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
                  fillOpacity: 0.25,
                }}
              />

              <Marker position={[-17.791771, -63.182385]} icon={schoolIcon}>
                <Popup>U.E. Colegio Cristo Rey - Área segura</Popup>
              </Marker>

              <Marker position={[position.lat, position.lng]} icon={childIcon}>
                <Popup>
                  Nino monitoreado
                  <br />
                  Lat: {position.lat.toFixed(6)}
                  <br />
                  Lng: {position.lng.toFixed(6)}
                </Popup>
              </Marker>

              <RecenterMap position={position} />
            </MapContainer>
          </div>
        </section>
      </section>
    </main>
  );
}
