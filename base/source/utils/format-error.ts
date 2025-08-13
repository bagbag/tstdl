import { unwrapError } from '#/errors/utils.js';
import type { Record, UndefinableJson } from '#/types/index.js';
import { decycle } from './object/decycle.js';
import { objectKeys } from './object/object.js';
import { isDefined, isFunction, isUndefined } from './type-guards.js';

export type FormatErrorOptions = {
  /**
   * Include error name in message
   */
  includeName?: boolean,

  /**
   * Include all error properties beside name and message
   */
  includeRest?: boolean | 'if-no-extra-info',

  /**
   * Include extraInfo from errors implementing {@link ErrorExtraInfo}
   */
  includeExtraInfo?: boolean,

  /**
   * Include stack trace
   */
  includeStack?: boolean,
};

export interface ErrorExtraInfo {
  /** Format extra data (without message and stack) as JSON */
  getExtraInfo(): UndefinableJson | undefined;
}

export function formatError(error: any, options: FormatErrorOptions = {}): string {
  const { includeRest = 'if-no-extra-info', includeExtraInfo = true, includeStack = true } = options;

  let name: string | undefined;
  let message: string | undefined;
  let stack: string | undefined;
  let rest: Record | undefined;
  let extraInfo: UndefinableJson | undefined;

  const actualError = unwrapError(error);

  if ((actualError instanceof Error)) {
    ({ name, message, stack, ...rest } = actualError);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (includeExtraInfo && isFunction((actualError as unknown as ErrorExtraInfo).getExtraInfo)) {
      extraInfo = (actualError as unknown as ErrorExtraInfo).getExtraInfo();
    }
  }

  if (isUndefined(name) && (isUndefined(message) || message.trim().length == 0)) {
    try {
      const decycledError = decycle(actualError);
      message = JSON.stringify(decycledError, null, 2);
    }
    catch {
      throw actualError;
    }
  }

  const nameString = (options.includeName ?? true) ? `${name ?? 'Error'}: ` : '';
  const decycledRest = isDefined(rest) ? decycle(rest) : undefined;
  const restString = (((includeRest == true) || ((includeRest == 'if-no-extra-info') && isUndefined(extraInfo))) && isDefined(decycledRest) && (objectKeys(rest ?? {}).length > 0)) ? `\n${JSON.stringify(decycledRest, null, 2)}` : '';
  const extraInfoString = isDefined(extraInfo) ? `\n${JSON.stringify(extraInfo, null, 2)}` : '';
  const stackString = (includeStack && isDefined(stack)) ? `\n${stack}` : '';

  return `${nameString}${message}${restString}${extraInfoString}${stackString}`;
}
