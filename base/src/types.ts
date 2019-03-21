export type Primitive = string | number | boolean | undefined | null;
export type StringMap<T = any> = { [key: string]: T };
export type NumberMap<T = any> = { [key: number]: T };
export type StringNumberMap<T = any> = { [key: string]: T, [key: number]: T };
export type Omit<T, P extends string | number | symbol> = Pick<T, Exclude<keyof T, P>>;
export type PartialProperty<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;
export type TypeOf<T extends object, P extends keyof T> = T[P];
export type PropertyOf<T extends object, P extends keyof T> = Property<P, Of<T>>;
export type Property<P extends keyof T, T extends object> = { [P2 in keyof T[P]]: T[P][P2] };
export type Of<T> = T;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepReadonly<T> = T extends Primitive ? T : T extends (any[] | ReadonlyArray<any>) ? DeepReadonlyArray<T[number]> : T extends Function ? T : DeepReadonlyObject<T>;
export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };
export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> { }
