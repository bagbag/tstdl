export type ElasticGeoPoint =
  | { lat: number, lon: number, z?: number }
  | [latitude: number, longitude: number, elevation?: number]
  | string;
