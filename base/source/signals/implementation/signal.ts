/* eslint-disable */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Signal } from './api.js';
import type { ValueEqualityFn } from './equality.js';
import { defaultEquals } from './equality.js';
import { throwInvalidWriteToSignalError } from './errors.js';
import type { ReactiveNode } from './graph.js';
import { producerAccessed, producerIncrementEpoch, producerNotifyConsumers, producerUpdatesAllowed, REACTIVE_NODE, SIGNAL } from './graph.js';

/**
 * If set, called after `WritableSignal`s are updated.
 *
 * This hook can be used to achieve various effects, such as running effects synchronously as part
 * of setting a signal.
 */
let postSignalSetFn: (() => void) | null = null;

export interface SignalNode<T> extends ReactiveNode {
  value: T;
  equal: ValueEqualityFn<T>;
  readonly [SIGNAL]: SignalNode<T>;
}

export type SignalBaseGetter<T> = (() => T) & { readonly [SIGNAL]: unknown };

// Note: Closure *requires* this to be an `interface` and not a type, which is why the
// `SignalBaseGetter` type exists to provide the correct shape.
export interface SignalGetter<T> extends SignalBaseGetter<T> {
  readonly [SIGNAL]: SignalNode<T>;
}

/**
 * Create a `Signal` that can be set or updated directly.
 */
export function createSignal<T>(initialValue: T): SignalGetter<T> {
  const node: SignalNode<T> = Object.create(SIGNAL_NODE);
  node.value = initialValue;
  const getter = (() => {
    producerAccessed(node);
    return node.value;
  }) as SignalGetter<T>;
  (getter as any)[SIGNAL] = node;
  return getter;
}

export function setPostSignalSetFn(fn: (() => void) | null): (() => void) | null {
  const prev = postSignalSetFn;
  postSignalSetFn = fn;
  return prev;
}

export function signalGetFn<T>(this: SignalNode<T>): T {
  producerAccessed(this);
  return this.value;
}

export function signalSetFn<T>(node: SignalNode<T>, newValue: T) {
  if (!producerUpdatesAllowed()) {
    throwInvalidWriteToSignalError();
  }

  const value = node.value;
  if (Object.is(value, newValue)) {
    if (!node.equal(value, newValue)) {
      console.warn('Signal value equality implementations should always return `true` for values that are the same according to `Object.is` but returned `false` instead.');
    }
  } else if (!node.equal(value, newValue)) {
    node.value = newValue;
    signalValueChanged(node);
  }
}

export function signalUpdateFn<T>(node: SignalNode<T>, updater: (value: T) => T): void {
  if (!producerUpdatesAllowed()) {
    throwInvalidWriteToSignalError();
  }

  signalSetFn(node, updater(node.value));
}

export function signalMutateFn<T>(node: SignalNode<T>, mutator: (value: T) => void): void {
  if (!producerUpdatesAllowed()) {
    throwInvalidWriteToSignalError();
  }
  // Mutate bypasses equality checks as it's by definition changing the value.
  mutator(node.value);
  signalValueChanged(node);
}

const SIGNAL_NODE: object = {
  ...REACTIVE_NODE,
  equal: defaultEquals,
  value: undefined,
};

function signalValueChanged<T>(node: SignalNode<T>): void {
  node.version++;
  producerIncrementEpoch();
  producerNotifyConsumers(node);
  postSignalSetFn?.();
}

/**
 * A `Signal` with a value that can be mutated via a setter interface.
 */
export interface WritableSignal<T> extends Signal<T> {
  /**
   * Directly set the signal to a new value, and notify any dependents.
   */
  set(value: T): void;

  /**
   * Update the value of the signal based on its current value, and
   * notify any dependents.
   */
  update(updateFn: (value: T) => T): void;

  /**
   * Returns a readonly version of this signal. Readonly signals can be accessed to read their value
   * but can't be changed using set, update or mutate methods. The readonly signals do _not_ have
   * any built-in mechanism that would prevent deep-mutation of their value.
   */
  asReadonly(): Signal<T>;
}

/**
 * Options passed to the `signal` creation function.
 */
export interface CreateSignalOptions<T> {
  /**
   * A comparison function which defines equality for signal values.
   */
  equal?: ValueEqualityFn<T>;
}

/**
 * Create a `Signal` that can be set or updated directly.
 */
export function signal<T>(initialValue: T, options?: CreateSignalOptions<T>): WritableSignal<T> {
  const signalFn = createSignal(initialValue) as SignalGetter<T> & WritableSignal<T>;
  const node = signalFn[SIGNAL];
  if (options?.equal) {
    node.equal = options.equal;
  }

  signalFn.set = (newValue: T) => signalSetFn(node, newValue);
  signalFn.update = (updateFn: (value: T) => T) => signalUpdateFn(node, updateFn);
  signalFn.asReadonly = signalAsReadonlyFn.bind(signalFn as any) as () => Signal<T>;

  return signalFn as WritableSignal<T>;
}

function signalAsReadonlyFn<T>(this: SignalGetter<T>): Signal<T> {
  const node = this[SIGNAL] as SignalNode<T> & { readonlyFn?: Signal<T> };
  if (node.readonlyFn === undefined) {
    const readonlyFn = () => this();
    (readonlyFn as any)[SIGNAL] = node;
    node.readonlyFn = readonlyFn as Signal<T>;
  }
  return node.readonlyFn;
}
