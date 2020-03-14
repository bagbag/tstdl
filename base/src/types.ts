export type Primitive = string | number | boolean | undefined | null;
export type PrimitiveValue = Primitive | PrimitiveObject | PrimitiveArray;
export type PrimitiveObject = { [key: string]: PrimitiveValue };
export type PrimitiveArray = PrimitiveValue[];

// eslint-disable-next-line capitalized-comments
// AsJson as workaround for https://github.com/Microsoft/TypeScript/issues/15300
export type AsJson<T> = T extends Json ? Json : Json;
export type Json = JsonPrimitive | JsonObject | JsonArray;
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];

export type AsUndefinableJson<T> = T extends UndefinableJson ? UndefinableJson : UndefinableJson;
export type AsUndefinableJsonInnerNode<T> = T extends UndefinableJsonInnerNode ? UndefinableJsonInnerNode : UndefinableJsonInnerNode;
export type UndefinableJson = JsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonInnerNode = UndefinableJsonPrimitive | UndefinableJsonObject | UndefinableJsonArray;
export type UndefinableJsonPrimitive = string | number | boolean | null | undefined;
export type UndefinableJsonObject = { [key: string]: UndefinableJsonInnerNode };
export type UndefinableJsonArray = UndefinableJsonInnerNode[];

export type Type<T, Args extends any[] = any> = new (...args: Args) => T;

export type StringMap<T = any> = { [key: string]: T };
export type NumberMap<T = any> = { [key: number]: T };
export type StringNumberMap<T = any> = { [key: string]: T, [key: number]: T };

export type Writable<T> = { -readonly [P in keyof T]: T[P] };

export type Omit<T, P extends keyof T> = Pick<T, Exclude<keyof T, P>>;
export type PartialProperty<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;
export type TypeOf<T extends object, P extends keyof T> = T[P];
export type PropertyOf<T extends object, P extends keyof T> = Property<P, Of<T>>;
export type Property<P extends keyof T, T extends object> = { [P2 in keyof T[P]]: T[P][P2] };
export type Of<T> = T;
export type PropertiesOfType<T, U> = { [P in keyof T]: T[P] extends U ? P : never }[keyof T];
export type ExtractPropertiesOfType<T, U> = { [P in PropertiesOfType<T, U>]: T[P] };

export type DeepArray<T> = (T | DeepArray<T>)[];

export type DeepReadonly<T> = T extends Primitive ? T : T extends (any[] | readonly any[]) ? DeepReadonlyArray<T[number]> : T extends Function ? T : DeepReadonlyObject<T>;
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
