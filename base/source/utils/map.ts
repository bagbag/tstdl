import { compareByValueSelectionDescending } from './comparison';

export function intersectMaps<K, V>(...maps: Map<K, V>[]): [K, V][] {
  if (maps.length == 0) {
    return [];
  }

  if (maps.length == 1) {
    return [...maps[0]!];
  }

  const sortedMaps = maps.sort(compareByValueSelectionDescending((map) => map.size));
  const [smallestMap, ...otherMaps] = sortedMaps;

  return [...smallestMap!].filter((entry) => !otherMaps.some((map) => !map.has(entry[0])));
}

export function differenceMaps<K, V>(base: Map<K, V>, ...maps: Map<K, V>[]): [K, V][] {
  return [...base].filter((entry) => !maps.some((map) => map.has(entry[0])));
}

export function symmetricDifferenceMaps<K, V>(...maps: Map<K, V>[]): Map<K, V> {
  if (maps.length == 0) {
    return new Map();
  }

  if (maps.length == 1) {
    return maps[0]!;
  }

  const [first, second, ...others] = maps;


  return symmetricDifferenceMaps(simpleSymmetricDifference(first!, second!), ...others);
}

export function uniquesMaps<K, V>(...maps: Map<K, V>[]): Map<K, V> {
  const result = new Map<K, V>();

  for (const map of maps) {
    for (const entry of map) {
      const unique = maps.every((otherMap) => (map == otherMap) || !otherMap.has(entry[0]));

      if (unique) {
        result.set(entry[0], entry[1]);
      }
    }
  }

  return result;
}

export function unionMaps<K, V>(...maps: Iterable<[K, V]>[]): Map<K, V> {
  return new Map(maps.flatMap((map) => [...map]));
}

function simpleSymmetricDifference<K, V>(a: Map<K, V>, b: Map<K, V>): Map<K, V> {
  return unionMaps(differenceMaps(a, b), differenceMaps(b, a));
}
