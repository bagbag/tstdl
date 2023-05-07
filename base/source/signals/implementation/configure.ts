import { configureSignals } from '../api.js';
import { isSignal } from './api.js';
import { computed } from './computed.js';
import { effect } from './effect.js';
import { signal } from './signal.js';
import { untracked } from './untracked.js';

export function configureDefaultSignalsImplementation(): void {
  configureSignals({
    signal,
    computed,
    effect,
    untracked,
    isSignal
  });
}
