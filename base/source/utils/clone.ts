import { objectEntries } from './object/object';
import { assertObject, isArray, isArrayBuffer, isDataView, isDate, isMap, isPrimitive, isRegExp, isSet, isTypedArray } from './type-guards';

const supportsStructuredClone = (typeof structuredClone == 'function');

export function clone<T>(object: T, deep: boolean): T {
  if (supportsStructuredClone && deep) {
    return structuredClone(object);
  }

  if (isPrimitive(object)) {
    return object;
  }

  if (isDate(object)) {
    return new Date(object) as unknown as T;
  }

  if (isRegExp(object)) {
    return new RegExp(object.source, object.flags) as unknown as T;
  }

  if (isSet(object)) {
    return new Set(object) as unknown as T;
  }

  if (isMap(object)) {
    return new Map(object) as unknown as T;
  }

  if (isArrayBuffer(object)) {
    return object.slice(0) as unknown as T;
  }

  if (isTypedArray(object)) {
    return object.slice() as unknown as T;
  }

  if (isDataView(object)) {
    const clonedBuffer = object.buffer.slice(0);
    return new DataView(clonedBuffer, object.byteOffset, object.byteLength) as unknown as T;
  }

  if (isArray(object)) {
    return deep
      ? object.map((value): any => clone(value, true)) as any as T
      : [...object] as unknown as T;
  }

  assertObject(object);

  if (!deep) {
    return { ...object } as T;
  }

  const entries = objectEntries(object).map(([key, value]) => [key, clone(value, true)] as const);
  return Object.fromEntries(entries) as unknown as T;
}
