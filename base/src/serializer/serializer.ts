import { Json, JsonPrimitive, StringMap, Type } from '../types';
import { registerBinaryTypes, registerDateType, registerFunctionType, registerRegExpType } from './handlers';
import { deserialize, Serializable, SerializableStatic, serialize } from './serializable';

declare const serializedSymbol: unique symbol;
declare const stringSerializedSymbol: unique symbol;

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

interface SerializerStatic {
  registerType(type: SerializableStatic): void;
  registerType<T, D extends Json>(type: Type<T>, serializer: SerializerFunction<T, D>, deserializer: DeserializerFunction<T, D>): void;
  registerType<T, D extends Json>(type: SerializableStatic, serializer?: SerializerFunction<T, D>, deserializer?: DeserializerFunction<T, D>): void;

  serialize<T>(object: T): StringSerialized<T>;
  rawSerialize<T>(object: T): Serialized<T>;

  deserialize<T = unknown>(serialized: StringSerialized<T> | string): T;
  rawDeserialize<T = unknown>(serialized: Serialized<T>): T;
}

// tslint:disable-next-line: class-name
class _Serializer {
  private static readonly customTypes: CustomTypesMap = new Map();

  static registerType(type: SerializableStatic): void;
  static registerType<T, D extends Json>(type: Type<T>, serializer: SerializerFunction<T, D>, deserializer: DeserializerFunction<T, D>): void;
  static registerType<T, D extends Json>(type: SerializableStatic | Type<T>, serializer?: SerializerFunction<T, D>, deserializer?: DeserializerFunction<T, D>): void {
    if (serializer != undefined && deserializer != undefined) {
      _Serializer.customTypes.set(type.name, { serializer, deserializer });
    }
    else {
      _Serializer.customTypes.set(type.name, { type: type as SerializableStatic });
    }
  }

  static serialize<T>(object: T): StringSerialized<T> {
    const serializedElement = _Serializer.rawSerialize(object);
    const serializedString = JSON.stringify(serializedElement);

    return serializedString;
  }

  static rawSerialize<T>(object: T): Serialized<T> {
    return _rawSerialize(object, _Serializer.customTypes) as Serialized<T>;
  }

  static deserialize<T = unknown>(serialized: StringSerialized<T> | string): T {
    const parsed = JSON.parse(serialized) as Serialized<T>;
    const deserialized = _Serializer.rawDeserialize(parsed);

    return deserialized;
  }

  static rawDeserialize<T = unknown>(serialized: Serialized<T>): T {
    return _rawDeserialize(serialized, _Serializer.customTypes) as T;
  }
}

// tslint:disable: no-unsafe-any no-object-literal-type-assertion

function _rawSerialize(object: any, customTypes: CustomTypesMap): any {
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
      const serialized = _rawSerialize(value, customTypes);

      serializedObject[property] = serialized;
    }

    return serializedObject;
  }

  if (object.constructor == Array) {
    return (object as any[]).map((item) => _rawSerialize(item, customTypes));
  }

  const customType = customTypes.get(object.constructor.name);
  if (customType != undefined) {
    let data: CustomNonPrimitive['data'] = { type: object.constructor.name, data: null };

    if (customType.serializer != undefined) {
      data.data = customType.serializer(object);
    }
    else if (object[serialize] != undefined) {
      data.data = (object as Serializable)[serialize]();
    }
    else {
      throw new Error(`neither Serializable implemented nor serialize method provided for ${object.constrcutor.name}`);
    }

    return { __type: 'custom', data } as CustomNonPrimitive;
  }

  throw new Error(`no suitable handler for ${object.constructor.name} available`);
}

function _rawDeserialize(object: any, customTypes: CustomTypesMap): any {
  const type = typeof object;
  if (object === null || type == 'string' || type == 'number' || type == 'boolean') {
    return object as JsonPrimitive;
  }

  if (object.constructor == Object) {
    if (object.hasOwnProperty(typeField)) {
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

        let instance: any;

        if (customType.deserializer != undefined) {
          instance = customType.deserializer(data);
        }
        else if (customType.type[deserialize] != undefined) {
          instance = customType.type[deserialize](data);
        }
        else {
          throw new Error(`neither SerializableStatic implemented nor deserialize method provided for ${(object as object).constructor.name}`);
        }

        return instance;
      }
    }

    const deserializedObject: StringMap<Json> = {};
    const properties = Object.getOwnPropertyNames(object);

    for (const property of properties) {
      const value = object[property];
      const deserialized = _rawDeserialize(value, customTypes);

      deserializedObject[property] = deserialized;
    }

    return deserializedObject;
  }

  if (object.constructor == Array) {
    return (object as any[]).map((item) => _rawDeserialize(item, customTypes));
  }

  throw new Error('no suitable handler available');
}

registerDateType(_Serializer);
registerRegExpType(_Serializer);
registerBinaryTypes(_Serializer);
registerFunctionType(_Serializer);

// tslint:disable-next-line: variable-name
export const Serializer = _Serializer as SerializerStatic;
