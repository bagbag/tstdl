import type { Observable, OperatorFunction } from 'rxjs';
import type { Signal } from './api';
import { toObservable } from './to-observable';
import { toSignal } from './to-signal';

export function pipe<I, A>(signal: Signal<I>, op1: OperatorFunction<I, A>): Signal<A>;
export function pipe<I, A, B>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>): Signal<B>;
export function pipe<I, A, B, C>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Signal<C>;
export function pipe<I, A, B, C, D>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): Signal<D>;
export function pipe<I, A, B, C, D, E>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): Signal<E>;
export function pipe<I, O>(signal: Signal<I>, ...operators: OperatorFunction<any, any>[]): Signal<O> {
  const observable = toObservable(signal, { emitImmediately: true });
  const piped = (observable.pipe as (...operators: OperatorFunction<any, any>[]) => any)(...operators) as Observable<O>;

  return toSignal(piped, { requireSync: true });
}
