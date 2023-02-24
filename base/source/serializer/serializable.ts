import type { AbstractConstructor, Record, Type, TypedOmit } from '#/types.js';
import { isDefined, isFunction } from '#/utils/type-guards.js';
import { registerDefaultSerializers } from './handlers/register.js';

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
  [Serializable.serialize](instance: T, context: Record): Data;
  [Serializable.deserialize](data: Data, tryDereference: TryDereference, context: Record): T;
}

export type SerializableType<T, Data> = Type<Serializable<T, Data>>;

export type SerializeFunction<T, Data> = Serializable<T, Data>[typeof Serializable.serialize];
export type DeserializeFunction<T, Data> = Serializable<T, Data>[typeof Serializable.deserialize];

type SerializableRegistration<T = any, Data = any> = {
  type: string,
  serializeData?: boolean,
  constructor: AbstractConstructor<T>,
  serializer: SerializeFunction<T, Data>,
  deserializer: DeserializeFunction<T, Data>
};

const constructorTypeNameMap = new Map<AbstractConstructor, string>();
const typeNameSerializerMap = new Map<string, SerializableRegistration>();
const rawSet = new Set<AbstractConstructor>();

export function getTypeNameByConstructor(constructor: AbstractConstructor): string | undefined {
  return constructorTypeNameMap.get(constructor);
}

export function getSerializerByTypeName(typeName: string): SerializableRegistration | undefined {
  return typeNameSerializerMap.get(typeName);
}

export function registerRawSerializable(constructor: AbstractConstructor): void {
  rawSet.add(constructor);
}

export function isRawSerializable(constructor: AbstractConstructor): boolean {
  return rawSet.has(constructor);
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

export function registerSerializer<T, Data>(constructor: AbstractConstructor<T>, typeName: string, serializer: SerializeFunction<T, Data>, deserializer: DeserializeFunction<T, Data>, options?: TypedOmit<SerializableRegistration, 'constructor' | 'deserializer' | 'serializer' | 'type'>): void {
  const existingMappedType = constructorTypeNameMap.get(constructor);
  const existingMappedSerializer = typeNameSerializerMap.get(typeName);

  if (isDefined(existingMappedType) || isDefined(existingMappedSerializer)) {
    const ctor = existingMappedSerializer?.constructor ?? constructor;
    throw new Error(`serializer for constructor ${ctor.name} is already registered as ${existingMappedType ?? typeName}`);
  }

  const registration: SerializableRegistration<T, Data> = { ...options, type: typeName, constructor, serializer, deserializer };

  constructorTypeNameMap.set(constructor, typeName);
  typeNameSerializerMap.set(typeName, registration);
}

registerDefaultSerializers(registerSerializer, registerRawSerializable);
