import type { Observable } from 'rxjs';
import type { Signal } from './signals';

export type ReactiveValue<T> = T | Signal<T> | Observable<T>;
