/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

import type { Observable } from 'rxjs';
import type { CamelCase, Except, IsEqual, LiteralUnion } from 'type-fest';

import type { Signal } from './signals/api.js';

export type ObjectLiteral = {}; // eslint-disable-line @typescript-eslint/no-empty-object-type

export type Function<P extends any[] = any[], R = any> = (...params: P) => R;

export type PrimitiveTypeMap = {
  string: string,
  number: number,
  boolean: boolean,
  bigint: bigint,
  symbol: symbol,
  object: object,
  function: Function,
  undefined: undefined
};

export type PrimitiveTypeString<T extends PrimitiveTypeMap[keyof PrimitiveTypeMap] = PrimitiveTypeMap[keyof PrimitiveTypeMap]> = Simplify<keyof PickBy<PrimitiveTypeMap, T>>;
export type PrimitiveType<T extends keyof PrimitiveTypeMap = keyof PrimitiveTypeMap> = Simplify<PrimitiveTypeMap[T]>;

export type Nested<T> = T | NestedObject<T> | NestedArray<T>;
export type NestedObject<T> = { [key: string]: Nested<T> };
export type NestedArray<T> = T[];

export type FilledArray<T> = [T, ...(T)[]];
export type FilledReadonlyArray<T> = readonly [T, ... (T)[]];

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;
export type PrimitiveValue = Primitive | PrimitiveObject | PrimitiveArray;
export type PrimitiveObject = { [key: string]: PrimitiveValue };
export type PrimitiveArray = PrimitiveValue[];
export type BuiltIn = Primitive | RegExp | Date | Function;
export type IsPrimitive<T> = [T] extends [Primitive] ? true : false;

export type Json = JsonPrimitive | JsonObject | JsonArray;
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[] | readonly Json[];

export type UndefinableJson = JsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonInnerNode = UndefinableJsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonPrimitive = JsonPrimitive | undefined;
export type UndefinableJsonObject = { [key: string]: UndefinableJsonInnerNode };
export type UndefinableJsonArray = UndefinableJsonInnerNode[] | readonly UndefinableJsonInnerNode[];

export type ArrayItem<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

export type Enumeration = EnumerationArray | EnumerationObject;
export type EnumerationArray = readonly [string | number, ...(string | number)[]];
export type EnumerationObject<V extends string | number = string | number> = Record<string, V>;
export type EnumerationKey<T extends EnumerationObject = EnumerationObject> = Extract<keyof T, string>;
export type EnumerationMap<T extends EnumerationObject = EnumerationObject> = SimplifyObject<{ [P in EnumerationKey<T>]: (T[P] extends number ? (`${T[P]}` extends `${infer U extends number}` ? U : never) : T[P]) | T[P] }>;
export type EnumerationValue<T extends Enumeration = Enumeration> = T extends EnumerationObject ? SimplifyDeep<EnumerationMap<T>[keyof EnumerationMap<T>]> : T extends EnumerationArray ? T[number] : never;
export type EnumerationEntry<T extends EnumerationObject = EnumerationObject> = { [P in EnumerationKey<T>]: [P, EnumerationMap<T>[P]] }[EnumerationKey<T>];
type EnumerationEntriesHelper<T extends EnumerationObject = EnumerationObject, Tuple = UnionToTuple<EnumerationKey<T>>> = { [P in keyof Tuple]: [Tuple[P], Tuple[P] extends EnumerationKey<T> ? EnumerationMap<T>[Tuple[P]] : never] };
export type EnumerationEntries<T extends EnumerationObject = EnumerationObject> = EnumerationEntriesHelper<T> extends (infer U)[] ? U[] : never;

export type Type<T = any, Arguments extends any[] = any> = Constructor<T, Arguments> & { prototype: T };
export type Constructor<T = any, Arguments extends any[] = any[]> = new (...args: Arguments) => T;
export type AbstractType<T = any, Arguments extends any[] = any[]> = AbstractConstructor<T, Arguments> & { prototype: T };
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

export type Writable<T> = T extends readonly (infer U)[] ? U[] : { -readonly [P in keyof T]: T[P] };
export type DeepWritable<T> = T extends readonly (infer U)[] ? DeepWritable<U>[] : { -readonly [P in keyof T]: DeepWritable<T[P]> };

export type RequiredKeys<T> = { [K in keyof T]-?: ObjectLiteral extends Pick<T, K> ? never : K }[keyof T];
export type OptionalKeys<T> = { [K in keyof T]-?: ObjectLiteral extends Pick<T, K> ? K : never }[keyof T];

export type TypedOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type TypedExtract<T, U extends T> = T extends U ? T : never;

export type ReplaceIfUnknown<T, U> = IfUnknown<T, U, T>;

export type OmitNever<T extends Record> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type BaseType<T extends Exclude<Primitive, null | undefined>> =
  T extends string ? string
  : T extends number ? number
  : T extends boolean ? boolean
  : T extends bigint ? bigint
  : T extends symbol ? symbol
  : T extends null ? null
  : T extends undefined ? undefined
  : never;

export type SharedProperties<A, B, C = unknown, D = unknown, E = unknown, F = unknown, G = unknown, H = unknown, I = unknown, J = unknown> = OmitNever<Pick<
  A & B & C & D & E & F & G & H & I & J,
  keyof A & keyof B & keyof ReplaceIfUnknown<C, never> & keyof ReplaceIfUnknown<D, never> & keyof ReplaceIfUnknown<E, never> & keyof ReplaceIfUnknown<F, never> & keyof ReplaceIfUnknown<G, never> & keyof ReplaceIfUnknown<H, never> & keyof ReplaceIfUnknown<I, never> & keyof ReplaceIfUnknown<J, never>
>>;

/**
 * Omit properties from a type that extend from a specific type.
 */
export type OmitBy<T, V> = Omit<T, { [K in keyof T]: V extends Extract<T[K], V> ? K : never }[keyof T]>;

/**
 * Normalize properties of a type that allow `undefined` to make them optional.
 */
export type Optionalize<T extends object> = OmitBy<T, undefined> & Partial<PickBy<T, undefined>>;

export type Unoptionalize<T extends object> = SimplifyObject<OmitBy<T, undefined> & { [P in PropertiesOfType<T, undefined>]: T[P] | undefined }>;

export type Merge<T1, T2> = SimplifyObject<Except<T1, Extract<keyof T1, keyof T2>> & T2>;

export type Simplify<T> = T extends BuiltIn ? T
  : T extends readonly any[] ? SimplifyArray<T>
  : T extends Record ? SimplifyObject<T>
  : T;

export type SimplifyObject<T extends Record> = { [K in keyof T]: T[K] } & {};
export type SimplifyArray<T extends readonly any[]> = { [I in keyof T]: Simplify<T[I]> };

export type SimplifyDeep<T> = T extends BuiltIn ? T
  : T extends readonly any[] ? { [I in keyof T]: SimplifyDeep<T[I]> }
  : T extends Record ? { [K in keyof T]: SimplifyDeep<T[K]> } & {}
  : T;

export type SimplifiedLiteralUnion<Literal extends Primitive, Base extends Primitive = BaseType<Exclude<Literal, null | undefined>>> = If<IsEqual<Literal, Base>, Literal, LiteralUnion<Literal, Base>>;

export type UnionToIntersection<Union> = (Union extends unknown ? (distributedUnion: Union) => void : never) extends ((mergedIntersection: infer Intersection) => void) ? Intersection : never;

export type UnionToTuple<T, Tuple extends any[] = []> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? UnionToTuple<Exclude<T, R>, [R, ...Tuple]> : Tuple;

export type UndefinableObject<T extends Record> = { [K in keyof T]: T[K] | undefined };

/**
 * Pick properties from a type that extend from a specific type.
 */
export type PickBy<T, V> = Pick<T, { [K in keyof T]: V extends Extract<T[K], V> ? K : never }[keyof T]>;

export type NonNullable<T> = T extends null ? never : T;
export type NonUndefinable<T> = T extends undefined ? never : T;
export type NonNullOrUndefinable<T> = T extends null | undefined ? never : T;

/**
 * Makes optional properties required and removes null and undefined
 */
export type DeepNonNullable<T> = T extends Record ? { [P in keyof T]-?: DeepNonNullable<T[P]> } : NonNullable<T>;

export type IfAny<T, Then, Else = never> = true extends (false & T) ? Then : Else;
export type IfUnknown<T, Then, Else = never> = unknown extends T ? Then : Else;

export type IsAny<T> = IfAny<T, true, false>;
export type IsUnknown<T> = IfUnknown<T, true, false>;

export type If<B extends boolean, Then, Else> = B extends true ? Then : Else;
export type Not<T extends boolean> = T extends true ? false : true;

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

export type ConstructorParameterDecorator = (target: object, propertyKey: undefined, parameterIndex: number) => void;

export type ReactiveValue<T> = T | Signal<T> | Observable<T>;

/* Type-fests PascalCase minus options. Fixes tsc bug for some reason */
export type PascalCase<Value> = CamelCase<Value> extends string ? Capitalize<CamelCase<Value>> : CamelCase<Value>;

type PickOmitDeepSelection<T> = T extends (infer U)[] ? (boolean | PickOmitDeepSelection<U>)
  : T extends Record<any> ? (boolean | { [P in keyof T]?: PickOmitDeepSelection<T[P]> })
  : boolean;

export type PickDeepSelection<T> = PickOmitDeepSelection<T>;
export type OmitDeepSelection<T> = PickOmitDeepSelection<T>;

export type PickDeep<T, S extends PickDeepSelection<T>> =
  T extends Record<any> ? Simplify<{
    [P in keyof S as S[P] extends (true | Record<any>) ? P : never]:
    S[P] extends true
    ? T[Extract<P, keyof T>]
    : T[Extract<P, keyof T>] extends (infer U)[]
    ? S[P] extends PickDeepSelection<U> ? PickDeep<U, S[P]>[] : never
    : S[P] extends Record<any>
    ? S[P] extends PickDeepSelection<T[Extract<P, keyof T>]> ? PickDeep<T[Extract<P, keyof T>], S[P]> : never
    : never
  }> : T;

export type OmitDeep<T, S extends OmitDeepSelection<T>> = T extends Record<any> ? Simplify<{
  [P in keyof T as true extends S[Extract<P, keyof S>] ? never : P]:
  [S[Extract<P, keyof S>]] extends ([false] | [never]) ? T[P]
  : S[Extract<P, keyof S>] extends Record<any>
  ? T[P] extends (infer U)[]
  ? S[Extract<P, keyof S>] extends OmitDeepSelection<U> ? OmitDeep<U, S[Extract<P, keyof S>]>[] : never
  : S[Extract<P, keyof S>] extends OmitDeepSelection<T[P]> ? OmitDeep<T[P], S[Extract<P, keyof S>]> : never
  : never
}> : T;
