import { signal } from './api.js';

export function createNotifier() {
  const sourceSignal = signal(0);

  return {
    listen: sourceSignal.asReadonly(),
    notify() {
      sourceSignal.update((v) => v + 1);
    },
  };
}
