import { computed as actualComputed, type CreateComputedOptions, type Signal } from './api.js';

export function computedWithDependencies<T>(computation: () => T, dependencies: Signal<any>[], options: CreateComputedOptions<T> = {}): Signal<T> {
  if (dependencies.length == 0) {
    return actualComputed(computation, options);
  }

  function computationWithDependencies(): T {
    for (let i = 0; i < dependencies.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
      dependencies[i]!();
    }

    return computation();
  }

  return actualComputed(computationWithDependencies, options);
}
