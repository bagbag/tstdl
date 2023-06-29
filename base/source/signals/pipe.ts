import { distinctUntilChanged, startWith, type Observable, type OperatorFunction } from 'rxjs';

import { isFunction } from '#/utils/type-guards.js';
import type { Signal } from './api.js';
import { toObservable, toSignal } from './api.js';

export type SignalPipeOptions = {
  /**
   * As we need an synchronous value for the resulting signal and effect scheduling is async, use the signals value as the initial value for the pipe.
   * This would normally result in double emission inside the pipe, but is mitigated by using {@link SignalPipeOptions.distinctUntilChanged}
   * @default true
   */
  startWithSignalValue?: boolean,

  /**
   * Whether to distinctUntilChanged source values. This must be disabled if signal mutation is used.
   * @default startWithSignalValue
   */
  distinctUntilChanged?: boolean
};

export function pipe<T, A>(signal: Signal<T>, op1: OperatorFunction<T, A>, options?: SignalPipeOptions): Signal<A>;
export function pipe<T, A, B>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, options?: SignalPipeOptions): Signal<B>;
export function pipe<T, A, B, C>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, options?: SignalPipeOptions): Signal<C>;
export function pipe<T, A, B, C, D>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, options?: SignalPipeOptions): Signal<D>;
export function pipe<T, A, B, C, D, E>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, options?: SignalPipeOptions): Signal<E>;
export function pipe<T, A, B, C, D, E, F>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, options?: SignalPipeOptions): Signal<F>;
export function pipe<T, A, B, C, D, E, F, G>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, options?: SignalPipeOptions): Signal<G>;
export function pipe<T, A, B, C, D, E, F, G, H>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, options?: SignalPipeOptions): Signal<H>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(signal: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>, options?: SignalPipeOptions): Signal<I>;
export function pipe<T, U>(signal: Signal<T>, ...operators: (OperatorFunction<any, any> | SignalPipeOptions | undefined)[]): Signal<U> {
  const last = operators.at(-1);
  const lastIsOperator = isFunction(last);

  const ops = (lastIsOperator ? operators : operators.slice(0, -1)) as OperatorFunction<any, any>[];
  const { startWithSignalValue = true, distinctUntilChanged: distinct } = (lastIsOperator ? undefined : last) ?? {};

  const optionOperators: OperatorFunction<any, any>[] = [];

  if (startWithSignalValue) {
    optionOperators.push(startWith(signal()));
  }

  if (distinct ?? startWithSignalValue) {
    optionOperators.push(distinctUntilChanged());
  }

  const observable = toObservable(signal);
  const piped = (observable.pipe as (...operators: OperatorFunction<any, any>[]) => any)(...optionOperators, ...ops) as Observable<U>;

  return toSignal(piped, { requireSync: true });
}
