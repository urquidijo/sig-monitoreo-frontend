"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth";
import RequireAuth from "./RequireAuth";

const LINKS = [
  { href: "/", label: "Mapa" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/centros", label: "Centros" },
  { href: "/ninos", label: "Niños" },
  { href: "/zonas", label: "Zonas" },
  { href: "/alertas", label: "Alertas" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Nav />
      {children}
    </RequireAuth>
  );
}

function Nav() {
  const { usuario, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <nav className="flex flex-wrap items-center gap-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pathname === link.href
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-400">
            {usuario?.nombre}{" "}
            <span className="text-xs uppercase text-cyan-300">
              ({usuario?.rol})
            </span>
          </p>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
