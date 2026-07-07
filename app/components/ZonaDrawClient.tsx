"use client";

import { useEffect, useState } from "react";
import type { LngLat } from "./ZonaDrawMap";

interface Props {
  puntos: LngLat[];
  onPuntosChange: (puntos: LngLat[]) => void;
}

type ZonaDrawComponent = React.ComponentType<Props>;

// Leaflet toca `window` al cargarse, por eso el mapa se importa solo en el
// cliente (mismo patrón que MapClient/MonitorMap).
export default function ZonaDrawClient(props: Props) {
  const [ZonaDrawMap, setZonaDrawMap] = useState<ZonaDrawComponent | null>(
    null,
  );

  useEffect(() => {
    import("./ZonaDrawMap").then((mod) => {
      setZonaDrawMap(() => mod.default);
    });
  }, []);

  if (!ZonaDrawMap) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950/50 text-sm text-slate-400">
        Cargando mapa...
      </div>
    );
  }

  return <ZonaDrawMap {...props} />;
}
