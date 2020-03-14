import { Writable } from './types';

export function polyfillAsyncIteratorSymbol(): void {
  const hasAsyncIteratorSymbol = 'asyncIterator' in Symbol;

  if (!hasAsyncIteratorSymbol) {
    (Symbol as Writable<typeof Symbol>).asyncIterator = Symbol.for('Symbol.asyncIterator');
  }
}
