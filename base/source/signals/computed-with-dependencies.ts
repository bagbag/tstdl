import type { CreateComputedOptions, Signal } from './api.js';
import { computed as actualComputed } from './api.js';

export function computedWithDependencies<T>(computation: () => T, dependencies: Signal<any>[], options: CreateComputedOptions<T> = {}): Signal<T> {
  if (dependencies.length == 0) {
    throw new Error('No additional dependencies provided.');
  }

  function actualComputation(): T {
    for (const dependency of dependencies) {
      dependency();
    }

    return computation();
  }

  return actualComputed(actualComputation, options);
}
