import type { AbstractConstructor, Type } from '#/types';
import { isDefined, isFunction } from '#/utils/type-guards';
import { registerDefaultSerializers } from './handlers';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Serializable = {
  serialize: Symbol('serialize'),
  deserialize: Symbol('deserialize')
} as {
  readonly serialize: unique symbol,
  readonly deserialize: unique symbol
};

export type DereferenceCallback = (dereferenced: unknown) => void;

export type TryDereference = (value: unknown, callback: DereferenceCallback) => boolean;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export interface Serializable<T, Data> {
  [Serializable.serialize](instance: T): Data;
  [Serializable.deserialize](data: Data, tryDereference: TryDereference): T;
}

export type SerializableType<T, Data> = Type<Serializable<T, Data>>;

export type SerializeFunction<T, Data> = Serializable<T, Data>[typeof Serializable.serialize];
export type DeserializeFunction<T, Data> = Serializable<T, Data>[typeof Serializable.deserialize];

type SerializableRegistration<T, Data> = {
  type: string,
  constructor: AbstractConstructor<T>,
  serializer: SerializeFunction<T, Data>,
  deserializer: DeserializeFunction<T, Data>
};

const constructorTypeNameMap = new Map<AbstractConstructor, string>();
const typeNameSerializerMap = new Map<string, SerializableRegistration<any, any>>();

export function getTypeNameByConstructor(constructor: AbstractConstructor): string | undefined {
  return constructorTypeNameMap.get(constructor);
}

export function getSerializerByTypeName(typeName: string): SerializableRegistration<any, any> | undefined {
  return typeNameSerializerMap.get(typeName);
}

export function serializable<T extends Serializable<any, Data>, Data>(typeName?: string): (target: SerializableType<T, Data>) => void {
  function serializableDecorator(type: SerializableType<T, Data>): void {
    registerSerializable(type, typeName);
  }

  return serializableDecorator;
}

/**
 * register a serializable type for serialization
 * @param type class implementing {@link Serializable}
 */
export function registerSerializable<T extends Serializable<any, Data>, Data>(type: SerializableType<T, Data>, typeName?: string): void {
  const { [Serializable.serialize]: serializer, [Serializable.deserialize]: deserializer } = (type.prototype as T);

  if (!isFunction(serializer) || !isFunction(deserializer)) {
    throw new Error('implementation for at least one of [type], [serialize] and [deserialize] is missing or of wrong type');
  }

  registerSerializer(type, typeName ?? type.name, serializer, deserializer);
}

export function registerSerializer<T, Data>(constructor: AbstractConstructor<T>, typeName: string, serializer: SerializeFunction<T, Data>, deserializer: DeserializeFunction<T, Data>): void {
  const existingMappedType = constructorTypeNameMap.get(constructor);
  const existingMappedSerializer = typeNameSerializerMap.get(typeName);

  if (isDefined(existingMappedType) || isDefined(existingMappedSerializer)) {
    const ctor = existingMappedSerializer?.constructor ?? constructor;
    throw new Error(`serializer for constructor ${ctor.name} is already registered as ${existingMappedType ?? typeName}`);
  }

  const registration: SerializableRegistration<T, Data> = { type: typeName, constructor, serializer, deserializer };

  constructorTypeNameMap.set(constructor, typeName);
  typeNameSerializerMap.set(typeName, registration);
}

registerDefaultSerializers(registerSerializer);
