import type { JsonObject } from './types.js';

export type Position = [longitude: number, latitude: number, elevation?: number];

export type GeoJsonObject<Type extends string> = {
  type: Type,
  bbox?: [number, number, number, number] | [number, number, number, number, number, number],
};

export type Point = GeoJsonObject<'Point'> & {
  coordinates: Position,
};

export type LineString = GeoJsonObject<'LineString'> & {
  coordinates: Position[],
};

export type Polygon = GeoJsonObject<'Polygon'> & {
  coordinates: Position[][],
};

export type MultiPoint = GeoJsonObject<'MultiPoint'> & {
  coordinates: Position[],
};

export type MultiLineString = GeoJsonObject<'MultiLineString'> & {
  coordinates: Position[][],
};

export type MultiPolygon = GeoJsonObject<'MultiPolygon'> & {
  coordinates: Position[][][],
};

export type GeometryCollection = GeoJsonObject<'GeometryCollection'> & {
  geometries: Geometry[],
};

export type Geometry = Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon | GeometryCollection;

export type Feature<G extends Geometry | null = null, P extends JsonObject | null = null> = GeoJsonObject<'Feature'> & {
  id?: string | number,
  geometry: G,
  properties: P,
};

export type FeatureCollection<G extends Geometry | null = null, P extends JsonObject | null = null> = GeoJsonObject<'FeatureCollection'> & {
  features: Feature<G, P>[],
};
