import type { Tagged } from 'type-fest';
import type * as Types from './implementation/index.js';

export type { CreateComputedOptions, CreateEffectOptions, CreateSignalOptions, EffectCleanupRegisterFn, EffectRef, Signal, ToObservableOptions, ToSignalOptions, WritableSignal } from './implementation/index.js';

export type SignalsInjector = Tagged<symbol, 'injector'>;

export type SignalsConfiguration<TInjector = SignalsInjector> = {
  signal: typeof Types.signal,
  computed: typeof Types.computed,
  effect: typeof Types.effect,
  untracked: typeof Types.untracked,
  isSignal: typeof Types.isSignal,
  toSignal: typeof Types.toSignal,
  toObservable: typeof Types.toObservable,
  isInSignalsInjectionContext: () => boolean,
  getCurrentSignalsInjector: () => TInjector,
  runInSignalsInjectionContext: <ReturnT>(injector: TInjector, fn: () => ReturnT) => ReturnT
};

/* eslint-disable import/no-mutable-exports */
export let signal: typeof Types.signal = throwSignalsNotConfigured;
export let computed: typeof Types.computed = throwSignalsNotConfigured;
export let effect: typeof Types.effect = throwSignalsNotConfigured;
export let untracked: typeof Types.untracked = throwSignalsNotConfigured;
export let isSignal: typeof Types.isSignal = throwSignalsNotConfigured as any;
export let toSignal: typeof Types.toSignal = throwSignalsNotConfigured;
export let toObservable: typeof Types.toObservable = throwSignalsNotConfigured;
export let isInSignalsInjectionContext: SignalsConfiguration['isInSignalsInjectionContext'] = throwSignalsNotConfigured;
export let getCurrentSignalsInjector: SignalsConfiguration['getCurrentSignalsInjector'] = throwSignalsNotConfigured;
export let runInSignalsInjectionContext: SignalsConfiguration['runInSignalsInjectionContext'] = throwSignalsNotConfigured;
/* eslint-enable import/no-mutable-exports */

export function configureSignals<TInjector>(configuration: SignalsConfiguration<TInjector>): void {
  ({ signal, computed, effect, untracked, isSignal, toSignal, toObservable, isInSignalsInjectionContext, runInSignalsInjectionContext, getCurrentSignalsInjector } = configuration as any as SignalsConfiguration);
}

function throwSignalsNotConfigured(): never {
  throw new Error('Signals are not configured. Use configureDefaultSignalsImplementation() for default implementation or configureSignals() for custom implementation.');
}
