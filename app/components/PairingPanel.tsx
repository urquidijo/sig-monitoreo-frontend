"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Nino = { id: number; nombre: string; activo: boolean };

type VinculacionCompletada = {
  ninoId: number;
  nombreNino: string;
};

type Props = {
  onVinculado: (data: VinculacionCompletada) => void;
};

export default function PairingPanel({ onVinculado }: Props) {
  const { authFetch } = useAuth();
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [ninoId, setNinoId] = useState<string>("");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [vinculado, setVinculado] = useState<VinculacionCompletada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    authFetch("/ninos")
      .then((data: Nino[]) => {
        const activos = data.filter((n) => n.activo);
        setNinos(activos);
        if (activos.length > 0) setNinoId(String(activos[0].id));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const generarCodigo = async () => {
    if (!ninoId) {
      setError("Selecciona un niño primero.");
      return;
    }

    setCargando(true);
    setError(null);
    setVinculado(null);

    try {
      const response = await fetch(`${API_URL}/vinculacion/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ninoId: Number(ninoId) }),
      });

      if (!response.ok) {
        throw new Error("No se pudo generar el código de vinculación.");
      }

      const data: { codigo: string } = await response.json();
      setCodigo(data.codigo);

      socketRef.current?.disconnect();
      const socket = io(API_URL, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-codigo", { codigo: data.codigo });
      });

      socket.on(
        "vinculacion:completada",
        (payload: VinculacionCompletada) => {
          setVinculado(payload);
          onVinculado(payload);
          socket.disconnect();
        },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al generar el código.",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Dispositivo móvil</p>
          <h2 className="mt-1 text-xl font-black">Vincular celular</h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/20 text-2xl">
          📱
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs uppercase tracking-widest text-slate-400">
          Niño a monitorear
        </label>
        <select
          value={ninoId}
          onChange={(e) => setNinoId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
        >
          {ninos.length === 0 && <option value="">No hay niños activos</option>}
          {ninos.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
      </div>

      {vinculado ? (
        <div className="mt-4 rounded-2xl bg-green-500/10 p-4 text-sm">
          <p className="font-semibold text-green-300">
            Dispositivo vinculado ✅
          </p>
          <p className="mt-1 text-slate-300">
            Recibiendo ubicación en tiempo real de {vinculado.nombreNino}.
          </p>
        </div>
      ) : codigo ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-slate-950/50 p-4">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={codigo} size={140} />
          </div>
          <p className="text-3xl font-mono font-black tracking-widest">
            {codigo}
          </p>
          <p className="text-center text-xs text-slate-400">
            Escanea el QR o ingresa el código en la app móvil. Expira en 5
            minutos.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-300">
          Genera un código para vincular el celular del niño y ver su
          ubicación real en el mapa.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={generarCodigo}
        disabled={cargando || !ninoId}
        className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {cargando
          ? "Generando..."
          : codigo
            ? "Generar nuevo código"
            : "Generar código de vinculación"}
      </button>
    </div>
  );
}
