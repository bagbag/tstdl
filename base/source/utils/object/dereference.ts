import { decodeJsonPath } from '#/json-path';
import type { StringMap } from '#/types';
import { memoizeSingle } from '../function/memoize';

/**
 * compiles a dereferencer for a specific reference
 * @param object object to dereference
 * @param reference path to property in dot notation or JSONPath ({@link decodeJsonPath})
 * @returns referenced value
 */
export function compileDereferencer(reference: string): (object: object) => unknown {
  const nodes = decodeJsonPath(reference);

  function dereferencer(object: object): unknown {
    let target = object;

    for (let i = 0; i < nodes.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
      target = (target as StringMap)[nodes[i]!];
    }

    return target;
  }

  return dereferencer;
}

/**
 * dereference a reference
 *
 * @description useful if you dereference a reference a few times at most
 *
 * also take a look at {@link getCachedDereference} and {@link compileDereferencer} if you need to dereference multiple times
 * @param object object to dereference
 * @param reference path to property in dot notation or JSONPath ({@link decodeJsonPath})
 * @returns referenced value
 */
export function dereference(object: object, reference: string): unknown {
  return compileDereferencer(reference)(object);
}

/**
 * cached version of {@link dereference}. It caches the internally used dereferencer, but it does *not* cache the referenced value
 *
 * @description
 * useful if you dereference multiple references, each multiple times
 *
 * also take a look at {@link dereference} and {@link compileDereferencer} for other use cases
 * @param object object to dereference
 * @param reference path to property in dot notation or JSONPath ({@link decodeJsonPath})
 * @returns referenced value
 */
export function getCachedDereference(): typeof dereference {
  const memoizedDereferencer = memoizeSingle(compileDereferencer);

  function cachedDereference(object: object, reference: string): unknown {
    return memoizedDereferencer(reference)(object);
  }

  return cachedDereference;
}
