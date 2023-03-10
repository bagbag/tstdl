import { noopPass } from '@tstdl/base/utils';
import type { Signal } from './api';
import { computed } from './computed';

export const emptySignalValue: unique symbol = Symbol('emptySignalValue');

export function errorOnEmpty<T>(signal: Signal<T>, errorMessage: string): Signal<T> {
  let handler = (value: T): T => {
    handler = noopPass;

    if (value == emptySignalValue) {
      throw new Error(errorMessage);
    }

    return value;
  };

  return computed(() => handler(signal()));
}

export function isEmpty(signal: Signal<any>): boolean {
  return signal() == emptySignalValue;
}
