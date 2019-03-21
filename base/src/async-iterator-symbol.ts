export function polyfillAsyncIteratorSymbol(): void {
  const hasAsyncIteratorSymbol = 'asyncIterator' in Symbol;

  if (!hasAsyncIteratorSymbol) {
    (Symbol as any).asyncIterator = Symbol.for('Symbol.asyncIterator');
  }
}
