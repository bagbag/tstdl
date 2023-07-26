import { computed, untracked, type Signal } from './api.js';

export function lazylize<T>(signalProvider: () => Signal<T>): Signal<T> {
  let source: Signal<T> | undefined;
  return computed(() => (source ??= untracked(() => signalProvider()))());
}
