"use client";

import { useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { io, Socket } from "socket.io-client";
import PairingPanel from "./PairingPanel";
import { useAuth } from "../../lib/auth";

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

type Zona = {
  id: number;
  nombre: string;
  activo: boolean;
  geojson: { type: "Polygon"; coordinates: number[][][] };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CENTRO_MAPA: [number, number] = [-17.791771, -63.182385];

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

export default function MonitorMap() {
  const { token, authFetch } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [dispositivos, setDispositivos] = useState<
    Record<number, DispositivoReal>
  >({});
  const socketRef = useRef<Socket | null>(null);

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
    authFetch("/zonas")
      .then((data: Zona[]) => setZonas(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket"],
      auth: { jwt: token },
    });
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
  }, [token]);

  const dispositivosFueraDeArea = Object.values(dispositivos).filter(
    (d) => d.dentroArea === false,
  );

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
                  <p className="text-sm text-slate-400">Dispositivos activos</p>
                  <h2 className="mt-1 text-2xl font-black">
                    {Object.keys(dispositivos).length}
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

            <PairingPanel onVinculado={handleVinculado} />
          </aside>

          <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
            {dispositivosFueraDeArea.map((dispositivo) => (
              <div
                key={dispositivo.ninoId}
                className="absolute left-6 right-6 top-6 z-999 rounded-2xl border border-red-200/40 bg-red-500/95 px-6 py-4 text-center text-lg font-black shadow-2xl"
              >
                🚨 Alerta: {dispositivo.nombreNino} salió del área segura
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

                {zonas
                  .filter((z) => z.activo)
                  .map((zona) => (
                    <GeoJSON
                      key={zona.id}
                      data={zona.geojson as any}
                      style={{
                        color: "#22c55e",
                        weight: 3,
                        fillColor: "#22c55e",
                        fillOpacity: 0.2,
                      }}
                    >
                      <Popup>{zona.nombre}</Popup>
                    </GeoJSON>
                  ))}

                {Object.values(dispositivos)
                  .filter((d) => d.lat !== null && d.lng !== null)
                  .map((dispositivo) => (
                    <Marker
                      key={dispositivo.ninoId}
                      position={[dispositivo.lat as number, dispositivo.lng as number]}
                      icon={dispositivoIcon(dispositivo.dentroArea)}
                    >
                      <Popup>
                        {dispositivo.nombreNino}
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
              </MapContainer>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
