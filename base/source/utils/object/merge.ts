import type { Record } from '#/types';
import { compareByValue } from '../comparison';
import { arrayEquals } from '../equals';
import { isArray, isPrimitive, isUndefined } from '../type-guards';
import { hasOwnProperty, objectEntries } from './object';

export type MergeObjectsOptions = {
  /**
   * whether to merge arrays or ensure they are equal
   * @default 'merge'
   */
  array?: 'merge' | 'merge-unique' | 'equals' | 'equals-sorted'
};

export function mergeObjects<T extends object>(objects: T[], options: MergeObjectsOptions = {}): T {
  return objects.reduce((merged, object) => _mergeObjects(merged, object, options), {}) as T;
}

function _mergeObjects(a: object, b: object, options: MergeObjectsOptions, path: string = '$'): object {
  const merged: Record<string> = { ...a };

  const bEntries = objectEntries(b);

  for (const [key, valueB] of bEntries) {
    if (!hasOwnProperty(merged, key)) {
      merged[key] = valueB;
      continue;
    }

    merged[key] = mergeValues(merged[key], valueB, options, `${path}.${key}`);
  }

  return merged;
}

// eslint-disable-next-line max-statements
function mergeValues(a: any, b: any, options: MergeObjectsOptions, path: string): any {
  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA != typeB) {
    throw new Error(`property type mismatch at ${path}`);
  }

  if (isPrimitive(a) || (typeA == 'function')) {
    if (a == b) {
      return a;
    }

    throw new Error(`property value mismatch at ${path}`);
  }

  if (isArray(a)) {
    if (!isArray(b)) {
      throw new Error(`property type mismatch at ${path}`);
    }

    return mergeArray(a, b, options, path); // eslint-disable-line @typescript-eslint/no-unsafe-return
  }

  return _mergeObjects(a as object, b as object, options, path);
}

function mergeArray<T, U>(a: readonly T[], b: readonly U[], options: MergeObjectsOptions, path: string): (T | U)[] {
  if (options.array == 'merge' || isUndefined(options.array)) {
    return [...a, ...b];
  }

  if (options.array == 'merge-unique') {
    return [...new Set([...a, ...b])];
  }

  if ((options.array == 'equals') || (options.array == 'equals-sorted')) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
    if (a.length != b.length) {
      throw new Error(`array length mismatch at ${path}`);
    }

    const sort = options.array == 'equals-sorted' ? compareByValue : undefined;

    if (!arrayEquals(a, b, { sort })) {
      throw new Error(`array values mismatch at ${path}`);
    }

    return [...a];
  }

  throw new Error(`unsupported array option ${options.array as string}`);
}
