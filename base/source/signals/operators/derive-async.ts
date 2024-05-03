import { Subject, concatAll, exhaustAll, isObservable, mergeAll, of, switchAll, takeUntil, type Observable } from 'rxjs';

import { registerFinalization } from '#/memory/finalization.js';
import { isPromise } from '#/utils/type-guards.js';
import { computed, toSignal, untracked, type Signal, type ToSignalOptions } from '../api.js';
import { effect } from '../implementation/effect.js';

export type DeriveAsyncOptions = ToSignalOptions & {
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
export function deriveAsync<T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions & { initialValue?: undefined, requireSync?: false }): Signal<T | undefined>;
export function deriveAsync<T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions & { initialValue?: null, requireSync?: false }): Signal<T | null>;
export function deriveAsync<T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions & { initialValue?: undefined, requireSync: true }): Signal<T>;
export function deriveAsync<T, const U extends T>(source: DeriveAsyncSourceParameter<T>, options: DeriveAsyncOptions & { initialValue: U, requireSync?: false }): Signal<T | U>;
export function deriveAsync<T, I>(source: () => (T | Promise<T> | Observable<T>), options?: DeriveAsyncOptions): Signal<T | I> {
  const outerSource = computed(source);

  const source$ = new Subject<Promise<T | I> | Observable<T | I>>();
  const destroy$ = new Subject<void>();

  const operator = operatorMap[options?.behavior ?? 'switch'];
  const valueSource$ = source$.pipe(
    operator(),
    takeUntil(destroy$)
  );

  const result = toSignal(valueSource$, options as any) as Signal<T | I>;

  const effectRef = effect(() => {
    const rawSource = outerSource();
    const observableInput = (isPromise(rawSource) || isObservable(rawSource)) ? rawSource : of(rawSource);
    untracked(() => source$.next(observableInput));
  });

  registerFinalization(result, () => {
    destroy$.next();
    effectRef.destroy();
  });

  return result;
}
