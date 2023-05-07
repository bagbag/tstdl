import * as AngularCore from '@angular/core';
import type * as Types from './implementation/index.js';

export type { CreateComputedOptions, CreateEffectOptions, CreateSignalOptions, EffectRef, Signal, WritableSignal } from './implementation/index.js';

export type SignalsConfiguration = {
  signal: typeof Types.signal,
  computed: typeof Types.computed,
  effect: typeof Types.effect,
  untracked: typeof Types.untracked,
  isSignal: typeof Types.isSignal
};

/* eslint-disable import/no-mutable-exports */
export let signal!: typeof Types.signal;
export let computed!: typeof Types.computed;
export let effect!: typeof Types.effect;
export let untracked!: typeof Types.untracked;
export let isSignal!: typeof Types.isSignal;
/* eslint-enable import/no-mutable-exports */

function configureSignals(configuration: SignalsConfiguration): void {
  signal = configuration.signal;
  computed = configuration.computed;
  effect = configuration.effect;
  untracked = configuration.untracked;
  isSignal = configuration.isSignal;
}

configureSignals({
  signal: AngularCore.signal,
  computed: AngularCore.computed,
  effect: AngularCore.effect,
  untracked: AngularCore.untracked,
  isSignal: AngularCore.isSignal
});
