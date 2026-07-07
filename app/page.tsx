import { Suspense } from "react";
import MapClient from "./components/MapClient";
import AppShell from "./components/AppShell";

export default function Home() {
  return (
    <AppShell>
      <Suspense>
        <MapClient />
      </Suspense>
    </AppShell>
  );
}