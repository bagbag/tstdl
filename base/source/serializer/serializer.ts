/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-deprecated */

import { CircularBuffer } from '#/data-structures/circular-buffer.js';
import { SortedArrayList } from '#/data-structures/sorted-array-list.js';
import type { Constructor, Function, Record, StringMap } from '#/types.js';
import { compareByValueSelection } from '#/utils/comparison.js';
import { ForwardRef } from '#/utils/object/forward-ref.js';
import { objectEntries } from '#/utils/object/object.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import type { DereferenceCallback } from './serializable.js';
import { getSerializerByTypeName, getTypeNameByConstructor, isRawSerializable } from './serializable.js';
import type { BigintNonPrimitive, CustomNonPrimitive, FunctionNonPrimitive, GlobalSymbolNonPrimitive, RawNonPrimitive, RefNonPrimitive, SerializationOptions, Serialized, SerializedData, StringSerialized, TypeField, UndefinedNonPrimitive } from './types.js';
import { bigintNonPrimitiveType, functionNonPrimitiveType, globalSymbolNonPrimitiveType, rawNonPrimitiveType, refNonPrimitiveType, undefinedNonPrimitiveType } from './types.js';

type QueueItem = () => void;

type DeserializeQueueItem = {
  depth: number,
  counter: number,
  fn: () => void
};

type DeserializeContext = {
  serializedRoot: unknown,
  options: SerializationOptions,
  references: Map<string, any>,
  deserializeQueue: SortedArrayList<DeserializeQueueItem>,
  derefQueue: CircularBuffer<QueueItem>,
  deserializeCounter: number,
  addToDeserializeQueue: (item: QueueItem, depth: number) => void,
  addManyToDeserializeQueue: (items: QueueItem[], depth: number) => void,
  tryAddToDerefQueue: (value: unknown, callback: DereferenceCallback) => boolean
};

export function stringSerialize<T>(value: T, options?: SerializationOptions): StringSerialized<T> {
  const serialized = serialize(value, options);
  return JSON.stringify(serialized) as StringSerialized<T>;
}

export function stringDeserialize<T = unknown>(serialized: string, options?: SerializationOptions): T { // eslint-disable-line @typescript-eslint/no-unnecessary-type-parameters
  const parsedStringSerialized = JSON.parse(serialized) as Serialized<T>;
  return deserialize(parsedStringSerialized, options);
}

/**
 * serializes a value using decycling and deserialization of registered types
 * @param value value to serialize
 * @param options serialization options
 * @returns serialized representation of `value` which is safe to {@link JSON.stringify}
 */
export function serialize<T>(value: T, options?: SerializationOptions): Serialized<T>;
/**
 * for internal use only
 * @deprecated
 */
export function serialize<T>(value: T, options: SerializationOptions, references: Map<any, string>, queue: CircularBuffer<QueueItem>, path: string): Serialized<T>;
export function serialize(_value: any, options: SerializationOptions = {}, references = new Map<any, string>(), queue = new CircularBuffer<QueueItem>(), path: string = '$'): SerializedData {
  let value = _value;

  if (isDefined(options.replacers)) {
    for (const replacer of options.replacers) {
      value = replacer(value, options.data);
    }
  }

  const type = typeof value;

  if (type == 'boolean' || type == 'number' || value === null) {
    return value;
  }

  if (type == 'undefined') {
    return { '<undefined>': null } as UndefinedNonPrimitive;
  }

  if ((path == '$') && isDefined(options.context)) {
    for (const entry of objectEntries(options.context)) {
      references.set(entry[1], `$['__context__']['${String(entry[0])}']`);
    }
  }

  const reference = references.get(value);

  if (isDefined(reference)) {
    return { '<ref>': reference } as RefNonPrimitive;
  }

  if (type == 'string') {
    if ((value as string).length > (path.length + 50)) {
      references.set(value, path);
    }

    return value;
  }

  if (type == 'bigint') {
    const stringValue = (value as bigint).toString(10);

    if (stringValue.length > (path.length + 50)) {
      references.set(value, path);
    }

    return { '<bigint>': stringValue } as BigintNonPrimitive;
  }

  if (type == 'symbol') {
    const key = Symbol.keyFor(value as symbol);

    if (key === undefined) {
      throw new Error('only global symbols from Symbol.for(<key>) are supported');
    }

    return { '<global-symbol>': key } as GlobalSymbolNonPrimitive;
  }

  if (type == 'function') {
    if (options.allowUnsafe !== true) {
      throw new Error('functions are only allowed if allowUnsafe option is true');
    }

    references.set(value, path);

    const source = (value as Function).toString();
    return { '<function>': source } as FunctionNonPrimitive;
  }

  if (type == 'object') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
    let result: SerializedData;

    references.set(value, path);

    const constructor = (value as object).constructor as Constructor;

    if (constructor == Array) {
      const target: SerializedData[] = [];
      target.length = (value as any[]).length;

      const queueItems = (value as any[]).map((innerValue, index): QueueItem => () => (target[index] = serialize(innerValue, options, references, queue, `${path}[${index}]`)));
      queue.addMany(queueItems);

      result = target as SerializedData;
    }
    else if (constructor == Object) {
      const target: Record = {};
      const entries = objectEntries(value);

      const queueItems = entries.map(([key, innerValue]): QueueItem => () => (target[key] = serialize(innerValue, options, references, queue, `${path}['${key.toString()}']`)));
      queue.addMany(queueItems);

      result = target;
    }
    else if (isRawSerializable(constructor) || (isDefined(options.raws) && options.raws.includes(constructor))) {
      references.set(value, path);
      return { '<raw>': value } as RawNonPrimitive;
    }
    else {
      const serializableType = getTypeNameByConstructor(constructor);

      if (isUndefined(serializableType)) {
        throw new Error(`constructor ${constructor.name} has no serializer registered`);
      }

      const registration = getSerializerByTypeName(serializableType);

      const typeString = getTypeString(serializableType);
      const nonPrimitive: CustomNonPrimitive<string> = { [typeString]: null };

      queue.add(() => {
        const data = registration!.serializer.call(value, value, options.data);
        (nonPrimitive[typeString] = (registration!.serializeData != false) ? serialize(data, options, references, queue, `${path}['${typeString}']`) : data);
      });

      result = nonPrimitive;
    }

    if (path == '$') {
      for (const fn of queue.consume()) {
        fn();
      }
    }

    return result;
  }

  throw new Error(`Unsupported type '${type as string}'.`);
}

export function deserialize<T>(serialized: Serialized<T>, options?: SerializationOptions): T;
export function deserialize(serialized: unknown, options?: SerializationOptions): unknown;
export function deserialize(serialized: unknown, options?: SerializationOptions): unknown {
  const context = getDeserializeContext(serialized, options);
  return _deserialize(serialized, context, '$', 0);
}

function _deserialize(serialized: unknown, context: DeserializeContext, path: string, depth: number): unknown {
  const type = typeof serialized;

  if ((type == 'number') || (type == 'boolean') || (serialized === null)) {
    return serialized;
  }

  if (type == 'string') {
    context.references.set(path, serialized);
    return serialized;
  }

  if (type == 'undefined') {
    return { '<undefined>': null } as UndefinedNonPrimitive;
  }

  if (type == 'object') {
    if ((depth == 0) && isDefined(context.options.context)) {
      for (const entry of objectEntries(context.options.context)) {
        context.references.set(`$['__context__']['${String(entry[0])}']`, entry[1]);
      }
    }

    const entries = objectEntries<StringMap>(serialized as Record);
    const isNonPrimitive = (entries.length == 1) && entries[0]![0].startsWith('<') && entries[0]![0].endsWith('>');

    if (isNonPrimitive) {
      const nonPrimitiveData = entries[0]![1];
      const nonPrimitiveType = entries[0]![0].slice(1, -1);

      switch (nonPrimitiveType) {
        case undefinedNonPrimitiveType: {
          return undefined;
        }

        case bigintNonPrimitiveType: {
          const bigint = BigInt(nonPrimitiveData as BigintNonPrimitive['<bigint>']);
          context.references.set(path, bigint);

          return bigint;
        }

        case globalSymbolNonPrimitiveType: {
          const symbol = Symbol.for(nonPrimitiveData as GlobalSymbolNonPrimitive['<global-symbol>']);
          context.references.set(path, symbol);

          return symbol;
        }

        case functionNonPrimitiveType: {
          if (context.options.allowUnsafe !== true) {
            throw new Error('functions are only allowed if allowUnsafe option is true');
          }

          const fn = eval(nonPrimitiveData as FunctionNonPrimitive['<function>']);
          context.references.set(path, fn);

          return fn;
        }

        case rawNonPrimitiveType: {
          return nonPrimitiveData;
        }

        case refNonPrimitiveType: {
          const dereferenced = context.references.get(nonPrimitiveData as RefNonPrimitive['<ref>']);

          if (dereferenced == undefined) {
            throw new Error(`reference ${nonPrimitiveData as RefNonPrimitive['<ref>']} not found`);
          }

          return dereferenced;
        }

        default: {
          const registration = getSerializerByTypeName(nonPrimitiveType);

          if (registration == undefined) {
            throw new Error(`non-primitive type ${nonPrimitiveType} not registered`);
          }

          const forwardRef = ForwardRef.create();
          context.references.set(path, forwardRef);

          context.addToDeserializeQueue(() => {
            const deserializedData = _deserialize(nonPrimitiveData, context, `${path}['<${nonPrimitiveType}>']`, depth + 1);

            context.addToDeserializeQueue(() => {
              const deserialized = registration.deserializer(deserializedData, context.tryAddToDerefQueue, context.options.data);
              ForwardRef.setRef(forwardRef, deserialized);
            }, depth);
          }, depth);

          if (depth == 0) {
            drainQueues(context);
            return ForwardRef.deref(forwardRef);
          }

          return forwardRef;
        }
      }
    }

    let result: unknown;
    const constructor = (serialized as object).constructor as Constructor;

    if (constructor == Array) {
      const deserializedArray: unknown[] = [];
      deserializedArray.length = (serialized as any[]).length;
      context.references.set(path, deserializedArray);

      const queueItems = (serialized as any[]).map((innerValue, index): QueueItem => () => {
        const deserialized = _deserialize(innerValue, context, `${path}[${index}]`, depth + 1);
        deserializedArray[index] = deserialized;

        context.tryAddToDerefQueue(deserialized, (dereferenced) => (deserializedArray[index] = dereferenced));

        return deserialized;
      });

      context.addManyToDeserializeQueue(queueItems, depth);

      result = deserializedArray;
    }
    else if (constructor == Object) {
      const deserializedObject: StringMap = {};
      context.references.set(path, deserializedObject);

      const queueItems = entries.map(([key, innerValue]): QueueItem => () => {
        const deserialized = _deserialize(innerValue, context, `${path}['${key}']`, depth + 1);
        deserializedObject[key] = deserialized;

        context.tryAddToDerefQueue(deserialized, (dereferenced) => (deserializedObject[key] = dereferenced));

        return deserialized;
      });

      context.addManyToDeserializeQueue(queueItems, depth);

      result = deserializedObject;
    }
    else {
      throw new Error(`Unsupported constructor ${constructor.name}.`);
    }

    if (depth == 0) {
      drainQueues(context);
    }

    return result;
  }

  throw new Error(`Unsupported type '${type}'.`);
}

function getTypeString<T extends string>(type: T): TypeField<T> {
  return `<${type}>`;
}

function getDeserializeContext(serializedRoot: unknown, options?: SerializationOptions): DeserializeContext {
  const context: DeserializeContext = {
    serializedRoot,
    options: options ?? {},
    references: new Map(),
    deserializeCounter: 0,
    deserializeQueue: new SortedArrayList<DeserializeQueueItem>(undefined, compareByValueSelection((item) => item.depth, (item) => item.counter)),
    derefQueue: new CircularBuffer(),
    addToDeserializeQueue(fn: QueueItem, depth: number) {
      context.deserializeQueue.add({ depth, counter: context.deserializeCounter++, fn });
    },
    addManyToDeserializeQueue(fns: QueueItem[], depth: number) {
      for (const fn of fns) {
        context.deserializeQueue.add({ depth, counter: context.deserializeCounter++, fn });
      }
    },
    tryAddToDerefQueue(value: unknown, callback: DereferenceCallback): boolean {
      if (!ForwardRef.isForwardRef(value) || (context.options.doNotDereferenceForwardRefs == true)) {
        return false;
      }

      context.derefQueue.add(() => {
        const dereferenced = ForwardRef.deref(value);
        callback(dereferenced);
      });

      return true;
    }
  };

  return context;
}

function drainQueues({ deserializeQueue, derefQueue }: DeserializeContext): void {
  while (deserializeQueue.size > 0) {
    const item = deserializeQueue.removeLast();
    item.fn();
  }

  for (const fn of derefQueue.consume()) {
    fn();
  }
}
