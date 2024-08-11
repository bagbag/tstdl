import { configureSignals } from '../api.js';
import { isSignal } from './api.js';
import { computed } from './computed.js';
import { effect } from './effect.js';
import { toObservable } from './to-observable.js';
import { toSignal } from './to-signal.js';
import { untracked } from './untracked.js';
import { signal } from './writable-signal.js';

export function configureDefaultSignalsImplementation(): void {
  configureSignals({
    signal,
    computed,
    effect,
    untracked,
    isSignal,
    toSignal,
    toObservable
  });
}
