import type { Json, JsonPrimitive, StringMap, Type } from '../types';
import { isDefined, isUndefined } from '../utils';
import { registerBinaryTypes, registerDateType, registerRegExpType } from './handlers';
import type { Serializable, SerializableStatic } from './serializable';
import { deserializeSymbol, serializeSymbol } from './serializable';

declare const serializedSymbol: unique symbol; // eslint-disable-line init-declarations
declare const stringSerializedSymbol: unique symbol; // eslint-disable-line init-declarations

export type Serialized<T> = { [serializedSymbol]?: T };
export type StringSerialized<T> = string & { [stringSerializedSymbol]?: T };

export type SerializerFunction<Type, Data> = (instance: Type) => Data;
export type DeserializerFunction<Type, Data> = (data: Data) => Type;

const typeField = '__type';

type NonPrimitive<T extends string = any, D extends Json | undefined = undefined> = {
  [typeField]: T,
  data: D
};

type UndefinedNonPrimitive = NonPrimitive<'undefined'>;
type CustomNonPrimitive = NonPrimitive<'custom', { type: string, data: Json }>;

type CustomTypesMap = Map<string, { type: SerializableStatic, serializer?: undefined, deserializer?: undefined } | { type?: undefined, serializer: SerializerFunction<any, any>, deserializer: DeserializerFunction<any, any> }>;

const customTypes: CustomTypesMap = new Map();

export function registerSerializationType(type: SerializableStatic): void;
export function registerSerializationType<T, D extends Json>(type: Type<T>, serializer: SerializerFunction<T, D>, deserializer: DeserializerFunction<T, D>): void;
export function registerSerializationType<T, D extends Json>(type: SerializableStatic | Type<T>, serializer?: SerializerFunction<T, D>, deserializer?: DeserializerFunction<T, D>): void {
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

export function serialize<T>(object: T): StringSerialized<T> {
  const serializedElement = rawSerialize(object);
  const serializedString = JSON.stringify(serializedElement);

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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// eslint-disable-next-line max-statements, max-lines-per-function, no-underscore-dangle
function _rawSerialize(object: any): any {
  const type = typeof object;
  if (object === null || type == 'string' || type == 'number' || type == 'boolean') {
    return object as JsonPrimitive;
  }

  if (object === undefined) {
    return { __type: 'undefined', data: undefined } as UndefinedNonPrimitive;
  }

  if (object.constructor == Object) {
    const serializedObject: StringMap<Json> = {};
    const properties = Object.getOwnPropertyNames(object);

    for (const property of properties) {
      const value = object[property];
      const serialized = _rawSerialize(value);

      serializedObject[property] = serialized;
    }

    return serializedObject;
  }

  if (object.constructor == Array) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return object.map((item) => _rawSerialize(item));
  }

  const objectConstructorName = object.constructor.name as string;
  const customType = customTypes.get(objectConstructorName);

  if (customType != undefined) {
    const data: CustomNonPrimitive['data'] = { type: objectConstructorName, data: null };

    if (customType.serializer != undefined) {
      data.data = customType.serializer(object);
    }
    else if (object[serializeSymbol] != undefined) {
      data.data = (object as Serializable)[serializeSymbol]();
    }
    else {
      throw new Error(`neither Serializable implemented nor serialize method provided for ${objectConstructorName}`);
    }

    return { __type: 'custom', data } as CustomNonPrimitive;
  }

  throw new Error(`no suitable handler for ${objectConstructorName} available`);
}

// eslint-disable-next-line max-statements, max-lines-per-function, no-underscore-dangle
function _rawDeserialize(object: any): any {
  const type = typeof object;
  if (object === null || type == 'string' || type == 'number' || type == 'boolean') {
    return object as JsonPrimitive;
  }

  if (object.constructor == Object) {
    if (Object.prototype.hasOwnProperty.call(object, typeField)) {
      // eslint-disable-next-line no-shadow
      const type = object[typeField];

      if (type == 'undefined') {
        return undefined;
      }

      if (type == 'custom') {
        const { type: customTypeName, data } = (object as CustomNonPrimitive).data;
        const customType = customTypes.get(customTypeName);

        if (customType == undefined) {
          throw new Error(`type ${customTypeName} not registered`);
        }

        const deserializer = customType.deserializer ?? customType.type[deserializeSymbol];

        if (isUndefined(deserializer)) {
          throw new Error(`neither SerializableStatic implemented nor deserialize method provided for ${(object as object).constructor.name}`);
        }

        const instance = deserializer(data);
        return instance; // eslint-disable-line @typescript-eslint/no-unsafe-return
      }
    }

    const deserializedObject: StringMap<Json> = {};
    const properties = Object.getOwnPropertyNames(object);

    for (const property of properties) {
      const value = object[property];
      const deserialized = _rawDeserialize(value);

      deserializedObject[property] = deserialized;
    }

    return deserializedObject;
  }

  if (object.constructor == Array) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return object.map((item) => _rawDeserialize(item));
  }

  throw new Error('no suitable handler available');
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

registerDateType(registerSerializationType);
registerRegExpType(registerSerializationType);
registerBinaryTypes(registerSerializationType);
