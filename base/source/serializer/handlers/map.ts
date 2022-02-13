import type { TryDereference } from '../serializable';

type MapData = [any, any][];

export function serializeMap(map: Map<any, any>): MapData {
  return [...map.entries()];
}

export function deserializeMap(data: MapData, tryDereference: TryDereference): Map<any, any> {
  const map = new Map();

  for (let [key, value] of data) {
    const hasKey = tryDereference(key, (dereferenced) => {
      key = dereferenced;

      if (!hasValue) { // eslint-disable-line @typescript-eslint/no-use-before-define
        map.set(key, value);
      }
    });

    const hasValue = tryDereference(value, (dereferenced) => map.set(key, dereferenced));

    if (!hasKey && !hasValue) {
      map.set(key, value);
    }
  }

  return map;
}
