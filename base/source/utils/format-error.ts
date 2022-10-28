import type { Record, UndefinableJson } from '#/types';
import { decycle } from './object/decycle';
import { objectKeys } from './object/object';
import { isDefined, isFunction, isUndefined } from './type-guards';

export type FormatErrorOptions = {
  /**
   * include all error properties beside name and message
   */
  includeRest?: boolean | 'if-no-extra-info',

  /**
   * include extraInfo from errors implementing {@link ErrorExtraInfo}
   */
  includeExtraInfo?: boolean,

  /**
   * include stack trace
   */
  includeStack?: boolean
};

export interface ErrorExtraInfo {
  /** format extra data (without message and stack) as JSON */
  getExtraInfo(): UndefinableJson | undefined;
}

// eslint-disable-next-line max-statements, complexity
export function formatError(error: any, options: FormatErrorOptions = {}): string {
  const { includeRest = 'if-no-extra-info', includeExtraInfo = true, includeStack = true } = options;

  let name: string | undefined;
  let message: string | undefined;
  let stack: string | undefined;
  let rest: Record | undefined;
  let extraInfo: UndefinableJson | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const wrappedError = error?.rejection ?? error?.reason ?? error?.error;

  if ((error instanceof Error) && !(error.message.startsWith('Uncaught') && (wrappedError instanceof Error))) {
    ({ name, message, stack, ...rest } = error);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (includeExtraInfo && isFunction((error as unknown as ErrorExtraInfo).getExtraInfo)) {
      extraInfo = (error as unknown as ErrorExtraInfo).getExtraInfo();
    }
  }
  else if (wrappedError instanceof Error) {
    return formatError(wrappedError, options);
  }

  if (isUndefined(name) && (isUndefined(message) || message.trim().length == 0)) {
    try {
      const decycledError = decycle(error);
      message = JSON.stringify(decycledError, null, 2);
    }
    catch {
      throw error;
    }
  }

  const decycledRest = isDefined(rest) ? decycle(rest) : undefined;
  const restString = (((includeRest == true) || ((includeRest == 'if-no-extra-info') && isUndefined(extraInfo))) && isDefined(decycledRest) && (objectKeys(rest ?? {}).length > 0)) ? `\n${JSON.stringify(decycledRest, null, 2)}` : '';
  const extraInfoString = isDefined(extraInfo) ? `\n${JSON.stringify(extraInfo, null, 2)}` : '';
  const stackString = (includeStack && isDefined(stack)) ? `\n${stack}` : '';

  return `${name ?? 'Error'}: ${message}${restString}${extraInfoString}${stackString}`;
}
