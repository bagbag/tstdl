import type { CreateComputedOptions, Signal } from './api.js';
import { computed as actualComputed } from './api.js';

export function computedWithDependencies<T>(computation: () => T, dependencies: Signal<any>[], options: CreateComputedOptions<T> = {}): Signal<T> {
  function computationWithDependencies(): T {
    for (let i = 0; i < dependencies.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
      dependencies[i]!();
    }

    return computation();
  }

  return actualComputed((dependencies.length == 0) ? computation : computationWithDependencies, options);
}
