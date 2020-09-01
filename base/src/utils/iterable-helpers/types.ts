export type Context<T> = { item: T, readonly index: number };
export type Predicate<T> = (item: T, index: number) => boolean;
export type FilterPredicate<T, TFiltered extends T = T> = (item: T, index: number) => item is TFiltered;
export type IteratorFunction<TIn, TOut> = (item: TIn, index: number) => TOut;
export type Reducer<T, U> = (previous: U, current: T, index: number) => U;
