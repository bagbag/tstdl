import { supportsBuffer } from '#/supports.js';
import { isDefined } from '#/utils/type-guards.js';
import type { registerRawSerializable, registerSerializer } from '../serializable.js';
import { deserializeArrayBuffer, deserializeBuffer, getTypedArrayDeserializer, serializeArrayBuffer, serializeBuffer, serializeTypedArray } from './binary.js';
import { deserializeDate, serializeDate } from './date.js';
import { deserializeError, serializeError } from './error.js';
import { deserializeMap, serializeMap } from './map.js';
import { deserializeRegExp, serializeRegExp } from './regex.js';
import { deserializeSet, serializeSet } from './set.js';

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

export function registerDefaultSerializers(register: typeof registerSerializer, registerRaw: typeof registerRawSerializable): void {
  register(Set, 'Set', serializeSet, deserializeSet);
  register(Map, 'Map', serializeMap, deserializeMap);
  register(RegExp, 'RegExp', serializeRegExp, deserializeRegExp);
  register(Date, 'Date', serializeDate, deserializeDate);
  register(Error, 'Error', serializeError, deserializeError);
  register(ArrayBuffer, 'ArrayBuffer', serializeArrayBuffer, deserializeArrayBuffer);

  for (const typedArray of typedArrays) {
    register(typedArray, typedArray.name, serializeTypedArray, getTypedArrayDeserializer(typedArray));
  }

  if (supportsBuffer) {
    register(Buffer, 'Buffer', serializeBuffer, deserializeBuffer);
  }

  if (typeof MessagePort != 'undefined') {
    registerRaw(MessagePort);
  }
}
