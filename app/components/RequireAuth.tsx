"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/login");
    }
  }, [cargando, usuario, router]);

  if (cargando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <p className="text-sm text-slate-400">Cargando...</p>
      </main>
    );
  }

  return <>{children}</>;
}
