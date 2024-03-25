/* eslint-disable @typescript-eslint/ban-types */

import type { Logger } from '#/logger/logger.js';
import { isArray, isPrimitive, isString } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';

export type WrapLogOptions = {
  fnName?: string,
  logResult?: boolean,
  logger?: Logger,
  trace?: boolean
};

export function wrapLog(fn: Function, { fnName = fn.name, logResult = true, logger, trace = false }: WrapLogOptions = {}): Function {
  const log = logger?.trace.bind(logger) ?? console.log.bind(console); // eslint-disable-line no-console

  const wrapped = {
    [fnName](...args: any[]): unknown {
      const argString = args.map((arg) => stringifyValue(arg)).join(', ');

      log(`[call: ${fnName}(${argString})]`);

      if (trace) {
        console.trace();
      }

      const result = Reflect.apply(fn, this, args);

      if (logResult) {
        const resultString = stringifyValue(result);
        log(`[return: ${fnName} => ${resultString}]`);
      }

      return result;
    }
  };

  return wrapped[fnName]!;
}

function stringifyValue(arg: any, depth = 1): string {
  if (isArray(arg) && (depth > 0)) {
    const argString = arg.map((innerArg) => stringifyValue(innerArg, depth - 1)).join(', ');
    return `[${argString}]`;
  }

  return isPrimitive(arg) ? isString(arg) ? `"${arg}"` : String(arg) : typeOf(arg);
}
