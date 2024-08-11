import { effect as actualEffect, type CreateEffectOptions, type EffectCleanupRegisterFn, type EffectRef, type Signal } from './api.js';

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
