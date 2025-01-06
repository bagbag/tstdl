import { Observable, type OperatorFunction } from 'rxjs';

export function teardown<T>(teardownFn: (lastValue: T | undefined, lastError: any) => unknown): OperatorFunction<T, T> {
  return (source: Observable<T>) => { // eslint-disable-line arrow-body-style
    return new Observable((subscriber) => {
      let lastValue: T | undefined;
      let lastError: any;

      const subscription = source.subscribe({
        next: (value) => {
          lastValue = value;
          subscriber.next(value);
        },
        error: (error) => {
          lastError = error;
          subscriber.error(error);
        },
        complete: () => subscriber.complete()
      });

      subscriber.add(subscription);
      subscriber.add(() => teardownFn(lastValue, lastError));
    });
  };
}
