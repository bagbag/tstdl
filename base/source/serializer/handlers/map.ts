import type { TryDereference } from '../serializer';

type MapData = [any, any][];

export function serializeMap(map: Map<any, any>): MapData {
  return [...map.entries()];
}

export function deserializeMap(data: MapData, tryDereference: TryDereference): Map<any, any> {
  const map = new Map(data);

  for (const entry of data) {
    let [key] = entry;

    const hasKey = tryDereference(key, (dereferenced) => {
      key = dereferenced;

      if (!hasValue) { // eslint-disable-line @typescript-eslint/no-use-before-define
        map.set(key, entry[1]);
      }
    });

    const hasValue = tryDereference(entry[1], (dereferenced) => map.set(key, dereferenced));

    if (!hasKey && !hasValue) {
      map.set(entry[0], entry[1]);
    }
  }

  return map;
}
