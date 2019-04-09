// tslint:disable: no-null-undefined-union

export type Primitive = string | number | boolean | undefined | null;
export type PrimitiveValue = Primitive | PrimitiveObject | PrimitiveArray;
export type PrimitiveObject = { [key: string]: PrimitiveValue };
export interface PrimitiveArray extends Array<PrimitiveValue> { }

export type Json = JsonPrimitive | JsonObject | JsonArray;
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: Json };
export interface JsonArray extends Array<Json> { }

export type Type<T> = new () => T;

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

export interface DeepArray<T> extends Array<T | DeepArray<T>> { }

export type DeepReadonly<T> = T extends Primitive ? T : T extends (any[] | ReadonlyArray<any>) ? DeepReadonlyArray<T[number]> : T extends Function ? T : DeepReadonlyObject<T>;
export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };
export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> { }
