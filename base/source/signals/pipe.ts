import { distinctUntilChanged, type Observable, type OperatorFunction } from 'rxjs';

import { startWithProvider } from '#/rxjs/start-with-provider.js';
import { untrack } from '#/rxjs/untrack.js';
import type { Signal } from './api.js';
import { toObservable, toSignal } from './api.js';

/**
 * As we need an synchronous value for the resulting signal and effect scheduling is async, it uses the source signals value as the initial value for the pipe.
 * This would normally result in double emission inside the pipe, but is mitigated by using {@link SignalPipeOptions.distinctUntilChanged}. Because of this, mutating source signals are not supported.
 * If you have an mutating signal or require more control for whatever reason, use {@link rawPipe} instead.
 */
export function pipe<T, A>(source: Signal<T>, op1: OperatorFunction<T, A>): Signal<A>;
export function pipe<T, A, B>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Signal<B>;
export function pipe<T, A, B, C>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Signal<C>;
export function pipe<T, A, B, C, D>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): Signal<D>;
export function pipe<T, A, B, C, D, E>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): Signal<E>;
export function pipe<T, A, B, C, D, E, F>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>): Signal<F>;
export function pipe<T, A, B, C, D, E, F, G>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>): Signal<G>;
export function pipe<T, A, B, C, D, E, F, G, H>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>): Signal<H>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>): Signal<I>;
export function pipe(source: Signal<unknown>, ...operators: OperatorFunction<unknown, unknown>[]): Signal<unknown>;
export function pipe(source: Signal<unknown>, ...operators: OperatorFunction<unknown, unknown>[]): Signal<unknown> {
  return rawPipe(source, startWithProvider(source), distinctUntilChanged(), ...operators);
}

/**
 * As we need an synchronous value for the resulting signal and effect scheduling is async, you have to provide an immediate value on subscription, for example via the `startWith` operator, otherwise an error is thrown.
 */
export function rawPipe<T, A>(source: Signal<T>, op1: OperatorFunction<T, A>): Signal<A>;
export function rawPipe<T, A, B>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Signal<B>;
export function rawPipe<T, A, B, C>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Signal<C>;
export function rawPipe<T, A, B, C, D>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): Signal<D>;
export function rawPipe<T, A, B, C, D, E>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): Signal<E>;
export function rawPipe<T, A, B, C, D, E, F>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>): Signal<F>;
export function rawPipe<T, A, B, C, D, E, F, G>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>): Signal<G>;
export function rawPipe<T, A, B, C, D, E, F, G, H>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>): Signal<H>;
export function rawPipe<T, A, B, C, D, E, F, G, H, I>(source: Signal<T>, op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>): Signal<I>;
export function rawPipe(source: Signal<unknown>, ...operators: OperatorFunction<unknown, unknown>[]): Signal<unknown>;
export function rawPipe(source: Signal<unknown>, ...operators: OperatorFunction<unknown, unknown>[]): Signal<unknown> {
  const piped = (toObservable(source).pipe as (...operators: OperatorFunction<unknown, unknown>[]) => Observable<unknown>)(...operators, untrack());
  return toSignal(piped, { requireSync: true });
}
