import type { Signal } from '@angular/core';
import type { } from '@tstdl/base/signals/api';
import type { Observable } from 'rxjs';

export type ReactiveValue<T> = T | Signal<T> | Observable<T>;

declare const SIGNAL: keyof Signal<any>;

declare module '@tstdl/base/signals/api' {
  interface Signal<T> {
    (): T;
    [SIGNAL]: unknown;
  }
}
