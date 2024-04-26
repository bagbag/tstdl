import { mapObjectValues } from '#/utils/object/object.js';
import { isArray } from '#/utils/type-guards.js';
import { computed, type Signal } from '../api.js';
import type { UnwrappedSignal } from '../types.js';

export type CombineInput = Signal<any>[];

export function combine<const T extends Signal<any>[]>(sources: T): Signal<{ [I in keyof T]: UnwrappedSignal<T[I]> }>;
export function combine<const T extends Record<any, Signal<any>>>(sources: T): Signal<{ [P in keyof T]: UnwrappedSignal<T[P]> }>;
export function combine<T>(sources: Signal<T>[] | Record<any, Signal<T>>): Signal<T[] | Record<any, T>> {
  const computation: () => T[] | Record<any, T> = isArray(sources)
    ? () => sources.map((source) => source())
    : () => mapObjectValues(sources, (source) => source());

  return computed(computation);
}
