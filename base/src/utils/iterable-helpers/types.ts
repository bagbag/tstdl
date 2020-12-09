export type Context<T> = { item: T, readonly index: number };
export type TypePredicate<T, TPredicate extends T> = (item: T, index: number) => item is TPredicate;
export type Predicate<T> = (item: T, index: number) => boolean;
export type IteratorFunction<TIn, TOut> = (item: TIn, index: number) => TOut;
export type Reducer<T, U> = (previous: U, current: T, index: number) => U;
export type IterableItemMetadata<T> = { index: number, isFirst: boolean, isLast: boolean, value: T };
