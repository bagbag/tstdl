/* eslint-disable @typescript-eslint/ban-types */

import type { Logger } from '#/logger/logger.js';
import { isArray, isPrimitive, isString } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';

export type WrapLogOptions = {
  fnName?: string,
  logger?: Logger
};

export function wrapLog(fn: Function, { fnName = fn.name, logger }: WrapLogOptions = {}): Function {
  const log = logger?.trace.bind(logger) ?? console.log.bind(console); // eslint-disable-line no-console

  const wrapped = {
    [fnName](...args: any[]): unknown {
      const argString = args.map((arg) => stringifyArg(arg)).join(', ');
      log(`[call: ${fnName}(${argString})]`);

      return Reflect.apply(fn, this, args);
    }
  };

  return wrapped[fnName]!;
}
function stringifyArg(arg: any, depth = 1): string {
  if (isArray(arg) && (depth > 0)) {
    const argString = arg.map((innerArg) => stringifyArg(innerArg, depth - 1)).join(', ');
    return `[${argString}]`;
  }

  return isPrimitive(arg) ? isString(arg) ? `"${arg}"` : String(arg) : typeOf(arg);
}
