import type { Signal } from './api.js';
import { computed } from './api.js';

export function switchMap<T>(source: () => Signal<T>): Signal<T> {
  const outerSource = computed(source);
  return computed(() => outerSource()());
}
