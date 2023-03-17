/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/consistent-indexed-object-style */

import type { UnionToIntersection } from 'type-fest';

export type ObjectLiteral = {};

export type PrimitiveTypeMap = {
  'string': string,
  'number': number,
  'boolean': boolean,
  'bigint': bigint,
  'symbol': symbol,
  'object': object,
  'function': Function,
  'undefined': undefined
};

export type PrimitiveTypeString<T extends PrimitiveTypeMap[keyof PrimitiveTypeMap] = PrimitiveTypeMap[keyof PrimitiveTypeMap]> = Simplify<keyof PickBy<PrimitiveTypeMap, T>>;
export type PrimitiveType<T extends keyof PrimitiveTypeMap = keyof PrimitiveTypeMap> = Simplify<PrimitiveTypeMap[T]>;

export type Nested<T> = T | NestedObject<T> | NestedArray<T>;
export type NestedObject<T> = { [key: string]: Nested<T> };
export type NestedArray<T> = T[];

export type FilledArray<T> = [T, ...(T)[]];
export type FilledReadonlyArray<T> = readonly [T, ... (T)[]];

export type Primitive = string | number | boolean | bigint | null | undefined | symbol;
export type PrimitiveValue = Primitive | PrimitiveObject | PrimitiveArray;
export type PrimitiveObject = { [key: string]: PrimitiveValue };
export type PrimitiveArray = PrimitiveValue[];
export type BuiltIn = Primitive | RegExp | Date | Function;

export type Json = JsonPrimitive | JsonObject | JsonArray;
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];

export type UndefinableJson = JsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonInnerNode = UndefinableJsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonPrimitive = JsonPrimitive | undefined;
export type UndefinableJsonObject = { [key: string]: UndefinableJsonInnerNode };
export type UndefinableJsonArray = UndefinableJsonInnerNode[] | readonly UndefinableJsonInnerNode[];

export type ArrayItem<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

export type Enumeration = EnumerationArray | EnumerationObject;
export type EnumerationArray = readonly [string | number, ...(string | number)[]];
export type EnumerationObject = Record<string, string | number>;
export type EnumerationKey<T extends EnumerationObject = EnumerationObject> = Extract<keyof T, string>;
export type EnumerationMap<T extends EnumerationObject = EnumerationObject> = SimplifyObject<{ [P in EnumerationKey<T>]: (T[P] extends number ? (`${T[P]}` extends `${infer U extends number}` ? U : never) : `${T[P]}`) | T[P] }>;
export type EnumerationValue<T extends Enumeration = Enumeration> = T extends EnumerationObject ? Simplify<EnumerationMap<T>[keyof EnumerationMap<T>]> : T extends EnumerationArray ? T[number] : never;
export type EnumerationEntry<T extends EnumerationObject = EnumerationObject> = { [P in EnumerationKey<T>]: [P, EnumerationMap<T>[P]] }[EnumerationKey<T>];
type EnumerationEntriesHelper<T extends EnumerationObject = EnumerationObject, Tuple = UnionToTuple<EnumerationKey<T>>> = { [P in keyof Tuple]: [Tuple[P], Tuple[P] extends EnumerationKey<T> ? EnumerationMap<T>[Tuple[P]] : never] };
export type EnumerationEntries<T extends EnumerationObject = EnumerationObject> = EnumerationEntriesHelper<T> extends (infer U)[] ? U[] : never;

export type Type<T = any, Arguments extends any[] = any> = Constructor<T, Arguments> & { prototype: T };
export type Constructor<T = any, Arguments extends any[] = any> = new (...args: Arguments) => T;
export type AbstractType<T = any, Arguments extends any[] = any> = AbstractConstructor<T, Arguments> & { prototype: T };
export type AbstractConstructor<T = any, Arguments extends any[] = any> = abstract new (...args: Arguments) => T;
export type ReturnTypeOrT<T> = T extends (...args: any) => infer R ? R : T;

export type Cast<X, Y> = X extends Y ? X : Y;
export type Record<K extends PropertyKey = PropertyKey, V = any> = { [P in K]: V };
export type DeepRecord<K extends PropertyKey = PropertyKey, V = any> = { [P in K]: V | DeepRecord<K, V> };
export type StringMap<T = any> = Record<string, T>;
export type NumberMap<T = any> = Record<number, T>;
export type StringNumberMap<T = any> = { [key: string]: T, [key: number]: T };

export type OneOrMany<T> = T | readonly T[];
export type WritableOneOrMany<T> = T | T[];

type FromEntriesEntryValue<T extends readonly (readonly [any, any])[], K> = Extract<T[number], readonly [K, any]>[1];

export type FromEntries<T> = T extends readonly (readonly [infer Key, any])[]
  ? { [K in Cast<Key, PropertyKey>]: Fallback<FromEntriesEntryValue<T, K>, T[number][1]> }
  : never;

export type Writable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWritable<T> = { -readonly [P in keyof T]: DeepWritable<T[P]> };

export type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

export type TypedOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type TypedExtract<T, U extends T> = T extends U ? T : never;

export type ReplaceIfUnknown<T, U> = IfUnknown<T, U, T>;

export type OmitNever<T extends Record> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type SharedProperties<A, B, C = unknown, D = unknown, E = unknown, F = unknown, G = unknown, H = unknown, I = unknown, J = unknown> = OmitNever<Pick<
  A & B & C & D & E & F & G & H & I & J,
  keyof A & keyof B & keyof ReplaceIfUnknown<C, never> & keyof ReplaceIfUnknown<D, never> & keyof ReplaceIfUnknown<E, never> & keyof ReplaceIfUnknown<F, never> & keyof ReplaceIfUnknown<G, never> & keyof ReplaceIfUnknown<H, never> & keyof ReplaceIfUnknown<I, never> & keyof ReplaceIfUnknown<J, never>
>>;

/**
 * omit properties from a type that extend from a specific type.
 */
export type OmitBy<T, V> = Omit<T, { [K in keyof T]: V extends Extract<T[K], V> ? K : never }[keyof T]>;

/**
 * normalize properties of a type that allow `undefined` to make them optional.
 */
export type Optionalize<T extends object> = OmitBy<T, undefined> & Partial<PickBy<T, undefined>>;

export type SimplifiedOptionalize<T extends object> = Simplify<Optionalize<T>>;

/**
 * remove nested type information
 */
export type Simplify<T> = T extends (Primitive | Function | Date | RegExp) ? T
  : T extends (infer AT)[] ? Simplify<AT>[]
  : T extends readonly (infer AT)[] ? readonly Simplify<AT>[]
  : T extends Record ? SimplifyObject<T>
  : T;

/**
 * remove type information on object
 */
export type SimplifyObject<T extends Record> = { [K in keyof T]: T[K] } & {};

export type UnionToTuple<T, Tuple extends any[] = []> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? UnionToTuple<Exclude<T, R>, [R, ...Tuple]> : Tuple;

export type UndefinableObject<T extends Record> = { [K in keyof T]: T[K] | undefined };

/**
 * pick properties from a type that extend from a specific type.
 */
export type PickBy<T, V> = Pick<T, { [K in keyof T]: V extends Extract<T[K], V> ? K : never }[keyof T]>;

export type NonNullable<T> = T extends null ? never : T;
export type NonUndefinable<T> = T extends undefined ? never : T;
export type NonNullOrUndefinable<T> = T extends null | undefined ? never : T;

/**
 * makes optional properties required and removes null and undefined
 */
export type DeepNonNullable<T> = T extends Record ? { [P in keyof T]-?: DeepNonNullable<T[P]> } : NonNullable<T>;

export type IfAny<T, Then, Else = never> = true extends (false & T) ? Then : Else;
export type IfUnknown<T, Then, Else = never> = unknown extends T ? Then : Else;

export type IsAny<T> = IfAny<T, true, false>;
export type IsUnknown<T> = IfUnknown<T, true, false>;

export type If<B extends Boolean, Then, Else> = B extends true ? Then : Else;

export type Fallback<T, F> = [T] extends [never] ? F : T;

export type PartialProperty<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;
export type TypeOf<T extends object, P extends keyof T> = T[P];
export type PropertyOf<T extends object, P extends keyof T> = Property<Of<T>, P>;
export type Property<T extends object, P extends keyof T> = { [P2 in keyof T[P]]: T[P][P2] };
export type Of<T> = T;
export type PropertiesOfType<T, U> = keyof PickBy<T, U>;

export type Flatten<T> = T extends readonly (infer R)[] ? R : T;
export type DeepFlatten<T> = T extends readonly (infer R)[]
  ? DeepFlatten<R>
  : T extends Record ? { [P in keyof T]: DeepFlatten<T[P]> }
  : T;

export type DeepArray<T> = (T | DeepArray<T>)[];

export type DeepReadonly<T> = T extends BuiltIn ? T : T extends (any[] | readonly any[]) ? DeepReadonlyArray<T[number]> : DeepReadonlyObject<T>;
export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };
export type DeepReadonlyArray<T> = readonly DeepReadonly<T>[];

export type ReplaceKey<T, K extends keyof T, U> = SimplifyObject<{ [P in keyof T]: P extends K ? U : T[P] }>;

export type DeepPartial<T> = T extends BuiltIn
  ? T
  : T extends any[] ? DeepPartialArray<T[number]>
  : T extends readonly any[] ? Readonly<DeepPartialArray<T[number]>>
  : DeepPartialObject<T>;
export type DeepPartialObject<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export type DeepPartialArray<T> = DeepPartial<T>[];

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export type BinaryData = ArrayBuffer | ArrayBufferView;

export type Paths<T extends Record> = T extends object
  ? { [K in keyof T]-?: K extends string | number ? K | `${K}.${Paths<T[K]>}` : never }[keyof T]
  : never;

export type TypeFromPath<T extends Record, Path extends Paths<T> | string> = {
  [K in Path]: K extends keyof T
  ? T[K]
  : K extends `${infer P}.${infer S}`
  ? T[P] extends Record
  ? TypeFromPath<T[P], S>
  : never
  : never;
}[Path];

export type ConstructorParameterDecorator = (target: Object, propertyKey: undefined, parameterIndex: number) => void;
