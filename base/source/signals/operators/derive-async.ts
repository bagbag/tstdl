import { Subject, concatAll, exhaustAll, from, isObservable, mergeAll, of, switchAll, takeUntil, type Observable } from 'rxjs';

import { registerFinalization } from '#/memory/finalization.js';
import { isPromise } from '#/utils/type-guards.js';
import { computed, effect, toSignal, untracked, type Signal, type ToSignalOptions } from '../api.js';

export type DeriveAsyncOptions<T> = ToSignalOptions<T> & {
  behavior?: DeriveAsyncBehavior
};

const operatorMap = {
  merge: mergeAll,
  concat: concatAll,
  exhaust: exhaustAll,
  switch: switchAll,
};

export type DeriveAsyncBehavior = keyof typeof operatorMap;

type DeriveAsyncSourceParameter<T> = () => (T | Promise<T> | Observable<T>);

export function deriveAsync<T>(source: DeriveAsyncSourceParameter<T>): Signal<T | undefined>;
export function deriveAsync<T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions<T> & { initialValue?: undefined, requireSync?: false }): Signal<T | undefined>;
export function deriveAsync<T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions<T> & { initialValue?: null, requireSync?: false }): Signal<T | null>;
export function deriveAsync<T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions<T> & { initialValue?: undefined, requireSync: true }): Signal<T>;
export function deriveAsync<T, const U extends T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions<T> & { initialValue: U, requireSync?: false }): Signal<T | U>;
export function deriveAsync<T, I>(source: () => (T | Promise<T> | Observable<T>), options?: DeriveAsyncOptions<T>): Signal<T | I> {
  const outerSource = computed(() => {
    const rawSource = source();

    if (isPromise(rawSource)) {
      return from(rawSource);
    }

    if (isObservable(rawSource)) {
      return rawSource;
    }

    return of(rawSource);
  });

  const source$ = new Subject<Promise<T | I> | Observable<T | I>>();
  const destroy$ = new Subject<void>();

  const operator = operatorMap[options?.behavior ?? 'switch'];
  const valueSource$ = source$.pipe(
    operator(),
    takeUntil(destroy$)
  );

  const result = toSignal(valueSource$, options as any) as Signal<T | I>;

  const effectRef = effect(() => {
    const observableInput = outerSource();
    untracked(() => source$.next(observableInput));
  });

  registerFinalization(result, () => {
    destroy$.next();
    effectRef.destroy();
  });

  return result;
}
