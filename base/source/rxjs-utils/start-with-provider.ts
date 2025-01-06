import { concat, defer, type Observable, of, type OperatorFunction } from 'rxjs';

export function startWithProvider<T, D>(valueProvider: () => D): OperatorFunction<T, T | D> {
  return function startWithProvider(source: Observable<T>) { // eslint-disable-line @typescript-eslint/no-shadow
    return concat(defer(() => of(valueProvider())), source);
  };
}
