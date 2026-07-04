"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { login, usuario, cargando } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cargando && usuario) {
      router.replace("/");
    }
  }, [cargando, usuario, router]);

  if (!cargando && usuario) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.14),transparent_30%)]" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-4xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
          SIG Monitoreo
        </p>
        <h1 className="mt-2 text-2xl font-black">Iniciar sesión</h1>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
              placeholder="admin@sig-monitoreo.com"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
