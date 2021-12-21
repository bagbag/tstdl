import { isDefined } from '#/utils/type-guards';
import type { registerSerializer } from '../serializer';
import { deserializeArrayBuffer, deserializeBuffer, getTypedArrayDeserializer, serializeArrayBuffer, serializeBuffer, serializeTypedArray } from './binary';
import { deserializeDate, serializeDate } from './date';
import { deserializeError, serializeError } from './error';
import { deserializeMap, serializeMap } from './map';
import { deserializeRegExp, serializeRegExp } from './regex';
import { deserializeSet, serializeSet } from './set';

const typedArrays = [
  globalThis.Int8Array,
  globalThis.Uint8Array,
  globalThis.Uint8ClampedArray,
  globalThis.Int16Array,
  globalThis.Uint16Array,
  globalThis.Int32Array,
  globalThis.Uint32Array,
  globalThis.Float32Array,
  globalThis.Float64Array,
  globalThis.BigInt64Array,
  globalThis.BigUint64Array
].filter(isDefined);

export function registerDefaultSerializers(register: typeof registerSerializer): void {
  register(Set, 'Set', serializeSet, deserializeSet);
  register(Map, 'Map', serializeMap, deserializeMap);
  register(RegExp, 'RegExp', serializeRegExp, deserializeRegExp);
  register(Date, 'Date', serializeDate, deserializeDate);
  register(Error, 'Error', serializeError, deserializeError);
  register(ArrayBuffer, 'ArrayBuffer', serializeArrayBuffer, deserializeArrayBuffer);

  for (const typedArray of typedArrays) {
    register(typedArray, typedArray.name, serializeTypedArray, getTypedArrayDeserializer(typedArray));
  }

  if (typeof Buffer != 'undefined') {
    register(Buffer, 'Buffer', serializeBuffer, deserializeBuffer);
  }
}
