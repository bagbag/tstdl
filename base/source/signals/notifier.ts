import { computed, type CreateComputedOptions, signal, type Signal } from './api.js';

type Notifier = {
  listen: Signal<number>,
  notify: () => void,
  computed: typeof computed
};

export function createNotifier(): Notifier {
  const sourceSignal = signal(0);

  const notifier = {
    listen: sourceSignal.asReadonly(),
    notify: () => sourceSignal.update((v) => v + 1),
    computed: <T>(computation: () => T, options?: CreateComputedOptions<T>) => computed(() => {
      notifier.listen();
      return computation();
    }, options)
  } satisfies Notifier;

  return notifier;
}
