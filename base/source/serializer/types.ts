import type { JsonPrimitive, Nested, StringMap } from '#/types';

declare const serializedSymbol: unique symbol;
declare const stringSerializedSymbol: unique symbol;
declare const decycledSymbol: unique symbol;

export type TypeField<T extends string> = `<${T}>`;
export type NonPrimitive<TypeName extends string = string, Data = unknown> = Record<TypeField<TypeName>, Data>;
export type UndefinedNonPrimitive = NonPrimitive<typeof undefinedNonPrimitiveType, null>;
export type BigintNonPrimitive = NonPrimitive<typeof bigintNonPrimitiveType, string>;
export type GlobalSymbolNonPrimitive = NonPrimitive<typeof globalSymbolNonPrimitiveType, string>;
export type FunctionNonPrimitive = NonPrimitive<typeof functionNonPrimitiveType, string>;
export type RefNonPrimitive = NonPrimitive<typeof refNonPrimitiveType, string>;
export type CustomNonPrimitive<TypeName extends string> = NonPrimitive<TypeName, SerializedData>;
export type SerializedData = JsonPrimitive | NonPrimitive | Nested<JsonPrimitive | NonPrimitive>;
export type Serialized<T = unknown> = SerializedData & { [serializedSymbol]: T };
export type StringSerialized<T = unknown> = string & { [stringSerializedSymbol]: T };
export type Decycled<T = unknown> = { [decycledSymbol]: T };

export type SerializationOptions = {
  /**
   * !!! DANGEROUS !!!
   *
   * enable de/serialization of stuff like functions
   *
   * remote code execution possible, source must be trusted!
   * @default false
   */
  allowUnsafe?: boolean,

  /**
   * context for references. Can be used to reduce serialized size, if data is available at deserialization and to be able to reference abitrary data which is not serializable like non-global symbols
   *
   * only first level of object is referenced. For example for `{ foo: { bar: 'baz' } }` there will be one context entry having { bar: 'baz' }
   */
  context?: StringMap<object | Function | string | symbol | bigint>, // eslint-disable-line @typescript-eslint/ban-types

  /**
   * disables dereferencing of ForwardRefs. Only useful for debugging (when implementing custom serializers) and curiosity
   * @default false
   */
  doNotDereferenceForwardRefs?: boolean
};

export const undefinedNonPrimitiveType = 'undefined';
export const bigintNonPrimitiveType = 'bigint';
export const globalSymbolNonPrimitiveType = 'global-symbol';
export const functionNonPrimitiveType = 'function';
export const refNonPrimitiveType = 'ref';
