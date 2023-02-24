// https://mathiasbynens.be/notes/globalthis
/* eslint-disable @typescript-eslint/naming-convention */

import type { StringMap } from './types.js';

declare const __magic__: { globalThis: any };

export function ensureGlobalThis(): void {
  if (typeof globalThis === 'object') {
    return;
  }

  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Object.prototype, '__magic__', {
    get(): any {
      // eslint-disable-next-line @typescript-eslint/ban-types
      return this as object;
    },
    configurable: true // this makes it possible to `delete` the getter later.
  });

  __magic__.globalThis = __magic__; // lolwat
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete (Object.prototype as StringMap)['__magic__'];
}
