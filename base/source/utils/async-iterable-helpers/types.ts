export type { Context } from '../iterable-helpers/types.js';

export type AsyncIteratorFunction<TIn, TOut> = (item: TIn, index: number) => TOut | Promise<TOut>;
export type AsyncPredicate<T> = (item: T, index: number) => boolean | Promise<boolean>;
export type AsyncRetryPredicate<T> = (error: Error, item: T, index: number) => boolean | Promise<boolean>;
export type AsyncReducer<T, U> = (previous: U, current: T, index: number) => U | Promise<U>;
export type AsyncGroupSelectors<T, TGroup extends any[]> = { [P in keyof TGroup]: AsyncIteratorFunction<T, TGroup[P]> };

export type ParallelizableIteratorFunction<TIn, TOut> = (item: TIn, index: number) => Promise<TOut>;
export type ParallelizablePredicate<T> = ParallelizableIteratorFunction<T, boolean>;

export type ThrottleFunction = () => Promise<void>;
