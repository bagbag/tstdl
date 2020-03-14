// https://mathiasbynens.be/notes/globalthis

import { StringMap } from './types';

declare const __magic__: { globalThis: any };

export function ensureGlobalThis(): void {
  if (typeof globalThis === 'object') {
    return;
  }

  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Object.prototype, '__magic__', {
    get(): any {
      return this as object;
    },
    configurable: true // this makes it possible to `delete` the getter later.
  });

  __magic__.globalThis = __magic__; // lolwat
  delete (Object.prototype as StringMap).__magic__;
}
