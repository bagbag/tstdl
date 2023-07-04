import type * as Types from './implementation/index.js';

export type { CreateComputedOptions, CreateEffectOptions, CreateSignalOptions, EffectCleanupRegisterFn, EffectRef, Signal, WritableSignal } from './implementation/index.js';

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
export let signal!: typeof Types.signal;
export let computed!: typeof Types.computed;
export let effect!: typeof Types.effect;
export let untracked!: typeof Types.untracked;
export let isSignal!: typeof Types.isSignal;
export let toSignal!: typeof Types.toSignal;
export let toObservable!: typeof Types.toObservable;
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
