import type { Feature, GeoJsonProperties, Polygon } from "geojson";

export const kinderPolygon: Feature<Polygon, GeoJsonProperties> = {
  type: "Feature",
  properties: {
    name: "U.E. Colegio Cristo Rey - Área Segura",
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-63.1826742, -17.7915172],
        [-63.1825422, -17.7922859],
        [-63.1819692, -17.7921795],
        [-63.1820959, -17.7913827],
        [-63.1826425, -17.7914921],
        [-63.1826742, -17.7915172],
      ],
    ],
  },
};