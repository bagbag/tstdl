import type { Observable } from 'rxjs';
import type { AsyncDisposable } from '../disposable';

export interface MessageBus<T> extends AsyncDisposable {
  readonly message$: Observable<T>;

  publish(message: T): Promise<void>;
}
