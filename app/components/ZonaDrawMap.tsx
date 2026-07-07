"use client";

import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

// Coordenada en orden GeoJSON: [longitud, latitud]
export type LngLat = [number, number];

const CENTRO_MAPA: [number, number] = [-17.791771, -63.182385];

function CapturadorClicks({
  onAgregar,
}: {
  onAgregar: (punto: LngLat) => void;
}) {
  useMapEvents({
    click(e) {
      // Leaflet entrega lat/lng; lo guardamos como [lng, lat] para GeoJSON
      onAgregar([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
}

interface Props {
  puntos: LngLat[];
  onPuntosChange: (puntos: LngLat[]) => void;
}

export default function ZonaDrawMap({ puntos, onPuntosChange }: Props) {
  // Leaflet dibuja en orden [lat, lng]
  const latlngs = puntos.map(([lng, lat]) => [lat, lng] as [number, number]);

  return (
    <MapContainer
      center={CENTRO_MAPA}
      zoom={17}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CapturadorClicks
        onAgregar={(punto) => onPuntosChange([...puntos, punto])}
      />

      {latlngs.length >= 3 && (
        <Polygon
          positions={latlngs}
          pathOptions={{
            color: "#22c55e",
            weight: 3,
            fillColor: "#22c55e",
            fillOpacity: 0.25,
          }}
        />
      )}

      {latlngs.length === 2 && (
        <Polyline
          positions={latlngs}
          pathOptions={{ color: "#22c55e", weight: 3 }}
        />
      )}

      {latlngs.map((pos, i) => (
        <CircleMarker
          key={i}
          center={pos}
          radius={6}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            // El primer vértice (donde cierra el polígono) se resalta en cian
            fillColor: i === 0 ? "#06b6d4" : "#22c55e",
            fillOpacity: 1,
          }}
        />
      ))}
    </MapContainer>
  );
}
