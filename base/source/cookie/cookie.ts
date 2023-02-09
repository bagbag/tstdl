import { NotSupportedError } from '#/error/not-supported.error';
import { isDefined, isNumber, isUndefined } from '#/utils/type-guards';

export type SetCookieOptions = {
  domain?: string,
  /** date or timestamp in milliseconds */
  expires?: Date | number,
  httpOnly?: boolean,
  /** in seconds */
  maxAge?: number,
  partitioned?: boolean,
  path?: string,
  sameSite?: 'strict' | 'lax' | 'none',
  secure?: boolean
};

const sameSiteMap = {
  none: 'None',
  lax: 'Lax',
  strict: 'Strict'
} as const;

export function formatSetCookie(name: string, value: string, options: SetCookieOptions = {}): string {
  const encodedValue = encodeURIComponent(value);

  let cookie = `${name}="${encodedValue}"`;

  if (isDefined(options.domain)) {
    cookie = `${cookie}; Domain=${options.domain}`;
  }

  if (isDefined(options.expires)) {
    const date = isNumber(options.expires) ? new Date(options.expires) : options.expires;
    cookie = `${cookie}; Expires=${date.toUTCString()}`;
  }

  if (isDefined(options.httpOnly) && options.httpOnly) {
    cookie = `${cookie}; HttpOnly`;
  }

  if (isDefined(options.maxAge)) {
    cookie = `${cookie}; Max-Age=${options.maxAge}`;
  }

  if (isDefined(options.partitioned) && options.partitioned) {
    cookie = `${cookie}; Partitioned`;
  }

  if (isDefined(options.path)) {
    cookie = `${cookie}; Path=${options.path}`;
  }

  if (isDefined(options.sameSite)) {
    const sameSiteValue = sameSiteMap[options.sameSite];

    if (isUndefined(sameSiteValue)) {
      throw new NotSupportedError(`Unknown option SameSite "${options.sameSite}".`);
    }

    cookie = `${cookie}; SameSite=${sameSiteValue}`;
  }

  if (isDefined(options.secure) && options.secure) {
    cookie = `${cookie}; Secure`;
  }

  return cookie;
}

export function parseCookieString(cookieString: string): Map<string, string> {
  const cookieEntries = cookieString
    .split(';')
    .map((cookiePartString) => {
      const splitIndex = cookiePartString.indexOf('=');
      const name = cookiePartString.slice(0, splitIndex).trim();
      const value = decodeURIComponent(cookiePartString.slice(splitIndex + 1).trim());

      return [name, value] as const;
    });

  return new Map(cookieEntries);
}
