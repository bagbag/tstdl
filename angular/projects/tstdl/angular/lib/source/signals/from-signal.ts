import { Observable } from 'rxjs';
import type { Signal } from './api';
import { effect } from './effect';

export function fromSignal<T>(signal: Signal<T>): Observable<T> {
  return new Observable((subscriber) => {
    const effectRef = effect(() => subscriber.next(signal()));
    return () => effectRef.destroy();
  });
}
