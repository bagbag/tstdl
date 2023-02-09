import { parseCookieString } from '#/cookie';
import { lazyProperty } from '#/utils/object/lazy-property';
import { isUndefined } from '#/utils/type-guards';
import type { HttpHeaders } from './http-headers';

export class CookieParser {
  private readonly cookies: Map<string, string>;

  constructor(httpHeaders: HttpHeaders) {
    lazyProperty(this as any, 'cookies', () => getCookies(httpHeaders));
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  tryGet(name: string): string | undefined {
    return this.cookies.get(name);
  }
}

function getCookies(httpHeaders: HttpHeaders): Map<string, string> {
  const cookieString = httpHeaders.tryGetSingle('Cookie') as string | undefined;

  if (isUndefined(cookieString)) {
    return new Map();
  }

  return parseCookieString(cookieString);
}
