import { Observable } from 'rxjs';

export interface MessageBus<T> {
  readonly message$: Observable<T>;

  publish(message: T): Promise<void>;
}
