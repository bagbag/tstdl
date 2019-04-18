// https://mathiasbynens.be/notes/globalthis

// tslint:disable

declare const __magic__: any;

(function () {
  if (typeof globalThis === 'object') {
    return;
  }

  Object.defineProperty(Object.prototype, '__magic__', {
    get: function () {
      return this;
    },
    configurable: true // This makes it possible to `delete` the getter later.
  });

  __magic__.globalThis = __magic__; // lolwat
  delete (Object.prototype as any).__magic__;
}());
