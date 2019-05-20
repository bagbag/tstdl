import { Observable } from 'rxjs';

export type Message<T> = {
  data: T
};

export interface MessageBus<T> {
  publish(data: T): Promise<void>;
  subscribe(): Observable<Message<T>>;
}
