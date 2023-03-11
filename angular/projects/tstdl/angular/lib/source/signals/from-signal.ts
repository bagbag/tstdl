import { Observable } from 'rxjs';
import type { Signal } from './api';
import { effect } from './effect';
import type { Watch } from './watch';

export function fromSignal<T>(signal: Signal<T>): Observable<T> {
  return new Observable((subscriber) => {
    const effectRef = effect(() => {
      try {
        subscriber.next(signal());
      }
      catch (error) {
        subscriber.error(error);
      }
    });

    (effectRef.consumer as Watch).run();

    return () => effectRef.destroy();
  });
}
