import type { Json, JsonPrimitive, StringMap, Type, UndefinableJson } from '../types';
import { isArray, isDefined, isObject, isUndefined } from '../utils';
import type { SerializableStatic } from './serializable';
import { deserializeSymbol, isSerializable, serializeSymbol } from './serializable';

declare const serializedSymbol: unique symbol; // eslint-disable-line init-declarations
declare const stringSerializedSymbol: unique symbol; // eslint-disable-line init-declarations

export type Serialized<T = unknown> = { [serializedSymbol]?: T };
export type StringSerialized<T = unknown> = string & { [stringSerializedSymbol]?: T };

export type SerializerFunction<Type, Data> = (instance: Type) => Data;
export type DeserializerFunction<Type, Data> = (data: Data) => Type;

type TypeField<T extends string> = `<${T}>`;

type NonPrimitive<Type extends string = string, Data = unknown> = Record<TypeField<Type>, Data>;

type UndefinedNonPrimitive = NonPrimitive<'undefined', null>;
type CustomNonPrimitive<Type extends string> = NonPrimitive<TypeField<Type>, Json>;

type CustomTypesMap = Map<string, { type: SerializableStatic, serializer?: undefined, deserializer?: undefined } | { type?: undefined, serializer: SerializerFunction<any, any>, deserializer: DeserializerFunction<any, any> }>;

const customTypes: CustomTypesMap = new Map();

export function registerSerializationType(type: SerializableStatic): void;
export function registerSerializationType<T, D extends UndefinableJson>(type: Type<T>, serializer: SerializerFunction<T, D>, deserializer: DeserializerFunction<T, D>): void;
export function registerSerializationType<T, D extends UndefinableJson>(type: SerializableStatic | Type<T>, serializer?: SerializerFunction<T, D>, deserializer?: DeserializerFunction<T, D>): void {
  if (serializer != undefined && deserializer != undefined) {
    customTypes.set(type.name, { serializer, deserializer });
  }
  else {
    customTypes.set(type.name, { type: type as SerializableStatic });
  }
}

export function hasSerializationType(object: any): boolean {
  const objectConstructorName = object.constructor.name as string; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
  const customType = customTypes.get(objectConstructorName);

  return isDefined(customType);
}

export function rawSerialize<T>(object: T): Serialized<T> {
  return _rawSerialize(object) as Serialized<T>;
}

export function serialize<T>(object: T, space?: string | number): StringSerialized<T> {
  const serializedElement = rawSerialize(object);
  const serializedString = JSON.stringify(serializedElement, undefined, space);

  return serializedString;
}

export function rawDeserialize<T = unknown>(serialized: Serialized<T>): T {
  return _rawDeserialize(serialized) as T;
}

export function deserialize<T = unknown>(serialized: StringSerialized<T> | string): T {
  const parsed = JSON.parse(serialized) as Serialized<T>;
  const deserialized = rawDeserialize(parsed);

  return deserialized;
}

// eslint-disable-next-line max-statements
function _rawSerialize(object: unknown): UndefinableJson {
  const type = typeof object;
  if (object === null || type == 'string' || type == 'number' || type == 'boolean') {
    return object as JsonPrimitive;
  }

  if (object === undefined) {
    return { '<undefined>': null } as UndefinedNonPrimitive;
  }

  if (isArray(object)) {
    return object.map((item) => _rawSerialize(item));
  }

  if (isObject(object)) {
    const serializedObject: StringMap<UndefinableJson> = {};
    const properties = Object.getOwnPropertyNames(object);

    for (const property of properties) {
      const value = (object as StringMap)[property];
      const serialized = _rawSerialize(value);

      serializedObject[property] = serialized;
    }

    return serializedObject;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  const objectConstructorName = (object as object).constructor.name;
  const customType = customTypes.get(objectConstructorName);

  if (customType != undefined) {
    let data: Json;

    if (customType.serializer != undefined) {
      data = customType.serializer(object);
    }
    else if (isSerializable(object)) {
      data = object[serializeSymbol]();
    }
    else {
      throw new Error(`neither Serializable implemented nor serialize method provided for ${objectConstructorName}`);
    }

    return { [`<${objectConstructorName}>`]: data } as CustomNonPrimitive<typeof objectConstructorName>;
  }

  throw new Error(`no suitable handler for ${objectConstructorName} available`);
}

// eslint-disable-next-line max-statements, max-lines-per-function, no-underscore-dangle
function _rawDeserialize(object: unknown): unknown {
  const type = typeof object;
  if (object === null || type == 'string' || type == 'number' || type == 'boolean') {
    return object as JsonPrimitive;
  }

  if (isObject(object)) {
    const properties = Object.getOwnPropertyNames(object);
    const firstProperty = properties[0];

    if (properties.length == 1 && firstProperty!.startsWith('<') && firstProperty!.endsWith('>')) {
      const fieldType = firstProperty!.slice(1, -1);
      const data = (object as StringMap)[firstProperty!];

      if (fieldType == 'undefined') {
        return undefined;
      }

      const customType = customTypes.get(fieldType);

      if (isUndefined(customType)) {
        throw new Error(`type ${fieldType} not registered`);
      }

      const deserializer = customType.deserializer ?? customType.type[deserializeSymbol];

      if (isUndefined(deserializer)) {
        // eslint-disable-next-line @typescript-eslint/ban-types
        throw new Error(`neither SerializableStatic implemented nor deserialize method provided for ${object.constructor.name}`);
      }

      const instance = deserializer(data);
      return instance; // eslint-disable-line @typescript-eslint/no-unsafe-return
    }

    const deserializedObject: StringMap<unknown> = {};

    for (const property of properties) {
      const value = (object as StringMap)[property];
      const deserialized = _rawDeserialize(value);

      deserializedObject[property] = deserialized;
    }

    return deserializedObject;
  }

  if (isArray(object)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return object.map((item) => _rawDeserialize(item));
  }

  throw new Error('no suitable handler available');
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
