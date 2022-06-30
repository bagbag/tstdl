import { lazyProperty } from '#/utils/object/lazy-property';
import { isUndefined } from '#/utils/type-guards';
import type { HttpHeaders } from './http-headers';

export class CookieParser {
  private readonly httpHeaders: HttpHeaders;
  private readonly cookies: Map<string, string>;

  constructor(httpHeaders: HttpHeaders) {
    this.httpHeaders = httpHeaders;

    lazyProperty(this as any, 'cookies', () => this.parseCookies());
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  private parseCookies(): Map<string, string> {
    const cookie = this.httpHeaders.tryGetSingle('Cookie') as string | undefined;

    if (isUndefined(cookie)) {
      return new Map();
    }

    const entries = cookie.split(';')
      .map((value) => value.trim())
      .map((value) => {
        const equalsIndex = value.indexOf('=');

        const name = value.slice(0, equalsIndex);
        const cookieValue = value.slice(equalsIndex + 1);

        return [name, cookieValue] as const;
      });

    return new Map(entries);
  }
}
