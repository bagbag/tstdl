import type { Signal } from '@angular/core';

declare const SIGNAL: keyof Signal<any>;

declare module '@tstdl/base/signals/api' {
  interface Signal<T> {
    (): T;
    [SIGNAL]: unknown;
  }
}
