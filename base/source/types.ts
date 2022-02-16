/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/consistent-indexed-object-style */

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

export type Primitive = string | number | boolean | bigint | null | undefined | symbol;
export type PrimitiveValue = Primitive | PrimitiveObject | PrimitiveArray;
export type PrimitiveObject = { [key: string]: PrimitiveValue };
export type PrimitiveArray = PrimitiveValue[];

export type Json = JsonPrimitive | JsonObject | JsonArray;
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];

export type UndefinableJson = JsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonInnerNode = UndefinableJsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonPrimitive = JsonPrimitive | undefined;
export type UndefinableJsonObject = { [key: string]: UndefinableJsonInnerNode };
export type UndefinableJsonArray = UndefinableJsonInnerNode[];

export type Constructor<T = any, Args extends any[] = any> = Type<T, Args>;
export type Type<T = any, Args extends any[] = any> = new (...args: Args) => T;

export type Record<K extends keyof any = any, V = any> = { [P in K]: V };
export type DeepRecord<K extends keyof any = any, V = any> = { [P in K]: V | DeepRecord<K, V> };
export type StringMap<T = any> = { [key: string]: T };
export type NumberMap<T = any> = { [key: number]: T };
export type StringNumberMap<T = any> = { [key: string]: T, [key: number]: T };

export type OneOrMany<T> = T | readonly T[];

export type Writable<T> = { -readonly [P in keyof T]: T[P] };

export type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

export type TypedOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type TypedExtract<T, U extends T> = T extends U ? T : never;

/**
 * omit properties from a type that extend from a specific type.
 */
export type OmitBy<T, V> = Omit<T, { [K in keyof T]: V extends Extract<T[K], V> ? K : never }[keyof T]>;

/**
 * normalize properties of a type that allow `undefined` to make them optional.
 */
export type Optionalize<S extends object> = OmitBy<S, undefined> & Partial<PickBy<S, undefined>>;

/**
 * remove nested type information
 */
export type Simplify<T> = T extends (Primitive | Function | Date | RegExp) ? T
  : T extends (infer AT)[] ? Simplify<AT>[]
  : T extends readonly (infer AT)[] ? readonly Simplify<AT>[]
  : { [K in keyof T]: T[K] } & {};

/**
 * remove type information on object
 */
export type SimplifyObject<T extends Record> = { [K in keyof T]: T[K] } & {};

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
export type DeepNonNullable<T extends Record> = { [P in keyof T]-?: T extends Record ? DeepNonNullable<NonNullable<T[P]>> : NonNullable<T[P]> };

export type IfAny<T, Then, Else = never> = true extends (false & T) ? Then : Else;
export type IfUnknown<T, Then, Else = never> = unknown extends T ? Then : Else;

export type IsAny<T> = IfAny<T, true, false>;
export type IsUnknown<T> = IfUnknown<T, true, false>;

export type If<B extends Boolean, Then, Else> = B extends true ? Then : Else;

export type PartialProperty<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;
export type TypeOf<T extends object, P extends keyof T> = T[P];
export type PropertyOf<T extends object, P extends keyof T> = Property<P, Of<T>>;
export type Property<P extends keyof T, T extends object> = { [P2 in keyof T[P]]: T[P][P2] };
export type Of<T> = T;
export type PropertiesOfType<T, U> = keyof PickBy<T, U>;

export type Flatten<T> = T extends readonly (infer R)[] ? R : T;
export type DeepFlatten<T> = T extends readonly (infer R)[]
  ? DeepFlatten<R>
  : T extends Record ? { [P in keyof T]: DeepFlatten<T[P]> }
  : T;

export type DeepArray<T> = (T | DeepArray<T>)[];

export type DeepReadonly<T> = T extends (Primitive | Function) ? T : T extends (any[] | readonly any[]) ? DeepReadonlyArray<T[number]> : DeepReadonlyObject<T>;
export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };
export type DeepReadonlyArray<T> = readonly DeepReadonly<T>[];

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
