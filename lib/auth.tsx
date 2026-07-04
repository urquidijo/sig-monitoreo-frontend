"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiFetch } from "./api";

type Usuario = {
  sub: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "TUTOR";
  tutorId: number | null;
};

type AuthContextValue = {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (path: string, options?: RequestInit) => Promise<any>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "sig-monitoreo-token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      setCargando(false);
      return;
    }

    apiFetch("/auth/me", stored)
      .then((data) => {
        setToken(stored);
        setUsuario(data);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch("/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(STORAGE_KEY, data.accessToken);
    setToken(data.accessToken);
    setUsuario(data.usuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUsuario(null);
  }, []);

  const authFetch = useCallback(
    (path: string, options?: RequestInit) => apiFetch(path, token, options),
    [token],
  );

  return (
    <AuthContext.Provider
      value={{ usuario, token, cargando, login, logout, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return ctx;
}
