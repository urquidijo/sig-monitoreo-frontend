"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const NINO_ID_DEMO = 1;

type VinculacionCompletada = {
  ninoId: number;
  nombreNino: string;
};

type Props = {
  onVinculado: (data: VinculacionCompletada) => void;
};

export default function PairingPanel({ onVinculado }: Props) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [vinculado, setVinculado] = useState<VinculacionCompletada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const generarCodigo = async () => {
    setCargando(true);
    setError(null);
    setVinculado(null);

    try {
      const response = await fetch(`${API_URL}/vinculacion/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ninoId: NINO_ID_DEMO }),
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
        disabled={cargando}
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
