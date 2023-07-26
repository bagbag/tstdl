import type * as Types from './implementation/index.js';

export type { CreateComputedOptions, CreateEffectOptions, CreateSignalOptions, EffectCleanupRegisterFn, EffectRef, Signal, ToSignalOptions, WritableSignal } from './implementation/index.js';

export type SignalsConfiguration = {
  signal: typeof Types.signal,
  computed: typeof Types.computed,
  effect: typeof Types.effect,
  untracked: typeof Types.untracked,
  isSignal: typeof Types.isSignal,
  toSignal: typeof Types.toSignal,
  toObservable: typeof Types.toObservable
};

/* eslint-disable import/no-mutable-exports */
export let signal: typeof Types.signal = throwSignalsNotConfigured;
export let computed: typeof Types.computed = throwSignalsNotConfigured;
export let effect: typeof Types.effect = throwSignalsNotConfigured;
export let untracked: typeof Types.untracked = throwSignalsNotConfigured;
export let isSignal: typeof Types.isSignal = throwSignalsNotConfigured as any;
export let toSignal: typeof Types.toSignal = throwSignalsNotConfigured;
export let toObservable: typeof Types.toObservable = throwSignalsNotConfigured;
/* eslint-enable import/no-mutable-exports */

export function configureSignals(configuration: SignalsConfiguration): void {
  signal = configuration.signal;
  computed = configuration.computed;
  effect = configuration.effect;
  untracked = configuration.untracked;
  isSignal = configuration.isSignal;
  toSignal = configuration.toSignal;
  toObservable = configuration.toObservable;
}

function throwSignalsNotConfigured(): never {
  throw new Error('Signals are not configured. Use configureDefaultSignalsImplementation() for default implementation or configureSignals() for custom implementation.');
}
