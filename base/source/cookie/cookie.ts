import { NotSupportedError } from '#/errors/not-supported.error.js';
import { trim } from '#/utils/string/trim.js';
import { isDefined, isNumber, isUndefined } from '#/utils/type-guards.js';

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
  priority?: 'low' | 'medium' | 'high',
  secure?: boolean
};

const sameSiteMap = {
  none: 'None',
  lax: 'Lax',
  strict: 'Strict'
} as const;

const priorityMap = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
} as const;

export function formatSetCookie(name: string, value: string, options: SetCookieOptions = {}): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;

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
      throw new NotSupportedError(`Unknown option sameSite "${options.sameSite}".`);
    }

    cookie = `${cookie}; SameSite=${sameSiteValue}`;
  }

  if (isDefined(options.priority)) {
    const priorityValue = priorityMap[options.priority];

    if (isUndefined(priorityValue)) {
      throw new NotSupportedError(`Unknown option priority "${options.priority}".`);
    }

    cookie = `${cookie}; Priority=${priorityValue}`;
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
      const rawValue = trim(cookiePartString.slice(splitIndex + 1).trim(), '"');
      const value = decodeURIComponent(rawValue);

      return [name, value] as const;
    });

  return new Map(cookieEntries);
}
