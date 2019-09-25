// https://mathiasbynens.be/notes/globalthis

declare const __magic__: { globalThis: any };

export function ensureGlobalThis(): void {
  if (typeof globalThis === 'object') {
    return;
  }

  Object.defineProperty(Object.prototype, '__magic__', {
    get(): any {
      return this;
    },
    configurable: true // This makes it possible to `delete` the getter later.
  });

  __magic__.globalThis = __magic__; // lolwat
  delete (Object.prototype as any).__magic__;
}
