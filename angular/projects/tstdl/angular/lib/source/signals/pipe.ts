import { noopPass } from '@tstdl/base/utils';
import type { Observable, OperatorFunction } from 'rxjs';
import type { Signal } from './api';
import { computed } from './computed';
import { fromObservable } from './from-observable';
import { fromSignal } from './from-signal';

const initialValueCheck = Symbol('initialValueCheck');

export function pipe<I, A>(signal: Signal<I>, op1: OperatorFunction<I, A>): Signal<A>;
export function pipe<I, A, B>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>): Signal<B>;
export function pipe<I, A, B, C>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Signal<C>;
export function pipe<I, A, B, C, D>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): Signal<D>;
export function pipe<I, A, B, C, D, E>(signal: Signal<I>, op1: OperatorFunction<I, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): Signal<E>;
export function pipe<I, O>(signal: Signal<I>, ...operators: OperatorFunction<any, any>[]): Signal<O> {
  const observable = fromSignal(signal);
  const piped = (observable.pipe as (...operators: OperatorFunction<any, any>[]) => any)(...operators) as Observable<O>;
  const result = fromObservable(piped, initialValueCheck as O);

  let handler = (value: O): O => {
    handler = noopPass;

    if (value == initialValueCheck) {
      throw new Error('Pipe had no initial value. If pipe is asynchronous, make sure to use startWith().');
    }

    return value;
  };

  return computed(() => handler(result()));
}
