const nonObjectBufferModeSymbol: unique symbol = Symbol();
const nonObjectStringModeSymbol: unique symbol = Symbol();

export type NonObjectMode = NonObjectBufferMode | NonObjectStringMode;

export type NonObjectBufferMode = {
  readonly [nonObjectBufferModeSymbol]: never
};

export type NonObjectStringMode = {
  readonly [nonObjectStringModeSymbol]: never
};

export type NonObjectModeTypes = string | Buffer | Uint8Array;

export type Data<T> =
  T extends NonObjectStringMode
  ? string
  : T extends NonObjectBufferMode
  ? Buffer
  : (T extends null ? never : T);
