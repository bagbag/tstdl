import type { StringMap } from '#/types';
import type { Serialized } from '../serializer';
import { deserialize, rawDeserialize, rawSerialize, registerSerializationType, serialize } from '../serializer';

type MapData = StringMap<Serialized<any>>;

export function registerMapType(): void {
  registerSerializationType(Map, serializeMap, deserializeMap);
}

function serializeMap(map: Map<any, any>): MapData {
  const entries = [...map.entries()].map(([key, value]) => [serialize(key), rawSerialize(value)] as const);
  return Object.fromEntries(entries) as MapData;
}

function deserializeMap(data: MapData): Map<any, any> {
  const entries = Object.entries(data).map(([key, serialized]) => [deserialize(key), rawDeserialize(serialized)] as const);
  return new Map(entries);
}
