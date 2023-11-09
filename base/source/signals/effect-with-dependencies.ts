import type { CreateEffectOptions, EffectCleanupRegisterFn, EffectRef, Signal } from './api.js';
import { effect as actualEffect } from './api.js';

export function effectWithDependencies(effectFn: (onCleanup: EffectCleanupRegisterFn) => void, dependencies: Signal<any>[], options?: CreateEffectOptions): EffectRef {
  if (dependencies.length == 0) {
    return actualEffect(effectFn, options);
  }

  function effectFnWithDependencies(onCleanup: EffectCleanupRegisterFn): void {
    for (let i = 0; i < dependencies.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
      dependencies[i]!();
    }

    effectFn(onCleanup);
  }

  return actualEffect(effectFnWithDependencies, options);
}
