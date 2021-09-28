import type { Observable } from 'rxjs';
import type { AsyncDisposable } from '../disposable';

export interface MessageBus<T> extends AsyncDisposable {
  readonly messages$: Observable<T>;
  readonly allMessages$: Observable<T>;

  publish(message: T): Promise<void>;
  publishAndForget(message: T): void;
}
