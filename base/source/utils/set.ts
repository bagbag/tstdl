/* eslint-disable max-statements */

import { compareByValueSelectionDescending } from './helpers';

export function intersectSets<T>(...sets: Set<T>[]): T[] {
  if (intersectSets.length == 0) {
    return [];
  }

  if (intersectSets.length == 1) {
    return [...sets[0]!];
  }

  const sortedSets = sets.sort(compareByValueSelectionDescending((set) => set.size));
  const [smallestSet, ...otherSets] = sortedSets;

  return [...smallestSet!].filter((value) => !otherSets.some((set) => !set.has(value)));
}

export function differenceSets<T>(base: Set<T>, ...sets: Set<T>[]): T[] {
  return [...base].filter((value) => !sets.some((set) => set.has(value)));
}

export function symmetricDifferenceSets<T>(...sets: Set<T>[]): Set<T> {
  if (sets.length == 0) {
    return new Set();
  }

  if (sets.length == 1) {
    return sets[0]!;
  }

  const [first, second, ...others] = sets;


  return symmetricDifferenceSets(simpleSymmetricDifference(first!, second!), ...others);
}

export function uniquesSets<T>(...sets: Set<T>[]): Set<T> {
  const result = new Set<T>();

  for (const set of sets) {
    for (const value of set) {
      const unique = sets.every((otherSet) => (set == otherSet) || !otherSet.has(value));

      if (unique) {
        result.add(value);
      }
    }
  }

  return result;
}

export function unionSets<T>(...sets: Iterable<T>[]): Set<T> {
  return new Set(sets.flatMap((set) => [...set]));
}

function simpleSymmetricDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  return unionSets(differenceSets(a, b), differenceSets(b, a));
}
