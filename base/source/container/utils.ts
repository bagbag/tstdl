import { isFunction, isString } from '#/utils/type-guards';
import type { InjectionToken } from './types';

export function getTokenName(token: InjectionToken | undefined): string {
  return isFunction(token)
    ? token.name
    : isString(token)
      ? `"${token}"`
      : String(token);
}
