import type { SIGNAL } from '@angular/core/primitives/signals';

export { SIGNAL };

declare module '@tstdl/base/signals/api' {
  export interface Signal<T> {
    (): T;
    [SIGNAL]: unknown;
  }
}
