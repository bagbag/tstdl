import type { Observable, OperatorFunction } from 'rxjs';

export function cast<Input extends Output, Output>(): OperatorFunction<Input, Output> {
  return (source: Observable<Input>) => source as Observable<Output>;
}

export function forceCast<Output>(): OperatorFunction<unknown, Output> {
  return (source: Observable<unknown>) => source as Observable<Output>;
}
