import { Observable } from 'rxjs';

export interface MessageBus<T> {
  publish(message: T): Promise<void>;
  subscribe(): Observable<T>;
}
