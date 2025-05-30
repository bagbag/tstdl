import type { SIGNAL } from '@angular/core/primitives/signals';

export type { SIGNAL };

declare module '@tstdl/base/signals' {
  export interface Signal<T> {
    (): T;
    [SIGNAL]: unknown;
  }
}
