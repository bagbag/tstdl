/* eslint-disable @typescript-eslint/ban-types */

import type { Logger } from '#/logger/logger.js';
import { isPrimitive } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';

export type WrapLogOptions = {
  fnName?: string,
  logger?: Logger
};

export function wrapLog(fn: Function, options?: WrapLogOptions): Function {
  const fnName = options?.fnName ?? fn.name;
  const log = options?.logger?.trace.bind(options.logger) ?? console.log.bind(console); // eslint-disable-line no-console

  const wrapped = {
    [fnName](...args: any[]): unknown {
      const argString = args.map((arg) => (isPrimitive(arg) ? arg : typeOf(arg))).join(', ');
      log(`[call: ${fnName}(${argString})]`);

      return Reflect.apply(fn, this, args);
    }
  };

  return wrapped[fnName]!;
}
