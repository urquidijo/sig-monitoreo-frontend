"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../../lib/auth";
import { ApiError } from "../../lib/api";

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "TUTOR";
  activo: boolean;
  tutor: { id: number; telefono: string | null } | null;
};

const FORM_INICIAL = {
  nombre: "",
  email: "",
  password: "",
  rol: "TUTOR" as "ADMIN" | "TUTOR",
  telefono: "",
};

function UsuariosContent() {
  const { authFetch } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = () => authFetch("/usuarios").then(setUsuarios).catch(console.error);

  useEffect(() => {
    cargar();
  }, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      await authFetch("/usuarios", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(FORM_INICIAL);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear usuario");
    } finally {
      setCargando(false);
    }
  };

  const desactivar = async (id: number) => {
    await authFetch(`/usuarios/${id}`, { method: "DELETE" });
    cargar();
  };

  return (
      <main className="min-h-screen bg-[#020617] p-5 text-white">
        <div className="mx-auto max-w-5xl space-y-6">
          <h1 className="text-3xl font-black">Gestionar Usuarios</h1>

          <form
            onSubmit={crear}
            className="grid gap-3 rounded-4xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:grid-cols-2"
          >
            <input
              required
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            />
            <input
              required
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            />
            <select
              value={form.rol}
              onChange={(e) =>
                setForm({ ...form, rol: e.target.value as "ADMIN" | "TUTOR" })
              }
              className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            >
              <option value="TUTOR">Tutor</option>
              <option value="ADMIN">Admin</option>
            </select>
            {form.rol === "TUTOR" && (
              <input
                placeholder="Teléfono (opcional)"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400 sm:col-span-2"
              />
            )}

            {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50 sm:col-span-2"
            >
              {cargando ? "Creando..." : "Crear usuario"}
            </button>
          </form>

          <div className="overflow-hidden rounded-4xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-white/5">
                    <td className="px-5 py-3">{u.nombre}</td>
                    <td className="px-5 py-3 text-slate-300">{u.email}</td>
                    <td className="px-5 py-3">{u.rol}</td>
                    <td className="px-5 py-3">
                      {u.activo ? (
                        <span className="text-green-400">Activo</span>
                      ) : (
                        <span className="text-red-400">Inactivo</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.activo && (
                        <button
                          onClick={() => desactivar(u.id)}
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

export default function UsuariosPage() {
  return (
    <AppShell>
      <UsuariosContent />
    </AppShell>
  );
}
