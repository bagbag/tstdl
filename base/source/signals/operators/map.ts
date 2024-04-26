import { computed, type Signal } from '../api.js';

export function map<T, R>(source: Signal<T>, mapper: (value: T) => R): Signal<R> {
  return computed(() => mapper(source()));
}
