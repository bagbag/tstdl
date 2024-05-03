import { computed, type Signal } from '../api.js';

export function switchAll<T>(source: () => Signal<T>): Signal<T> {
  const outerSource = computed(source);
  return computed(() => outerSource()());
}
