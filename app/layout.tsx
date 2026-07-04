import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "../lib/auth";

export const metadata: Metadata = {
  title: "SIG Monitoreo Infantil",
  description: "Aplicación SIG de monitoreo infantil en tiempo real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}