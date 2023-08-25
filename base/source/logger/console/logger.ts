/* eslint-disable no-console */

import { Singleton } from '#/injector/decorators.js';
import type { PickBy, Record } from '#/types.js';
import { now } from '#/utils/date-time.js';
import { formatError } from '#/utils/format-error.js';
import { isDefined, isObject, isString } from '#/utils/type-guards.js';
import { LogLevel } from '../level.js';
import type { LogErrorOptions, LoggerArgument, LoggerForkOptions } from '../logger.js';
import { Logger } from '../logger.js';

const consoleLevelFuncMap: Record<LogLevel, keyof PickBy<typeof console, (message: string) => void>> = {
  [LogLevel.Error]: 'error',
  [LogLevel.Warn]: 'warn',
  [LogLevel.Info]: 'info',
  [LogLevel.Verbose]: 'info',
  [LogLevel.Debug]: 'debug',
  [LogLevel.Trace]: 'debug'
};

@Singleton<ConsoleLogger, LoggerArgument>({
  provider: {
    useFactory: (argument, context) => {
      if (isObject(argument)) {
        return new ConsoleLogger(argument.level ?? context.resolve(LogLevel), argument.module, argument.prefix);
      }

      return new ConsoleLogger(context.resolve(LogLevel), argument, undefined);
    }
  }
})
export class ConsoleLogger extends Logger {
  private readonly entryPrefix: string;

  constructor(level: LogLevel, module?: string | string[], prefix?: string) {
    super(level, module, prefix);

    const modulePrefix = isDefined(this.module) ? this.module.map((m) => `[${m}]`).join(' ') : '';
    this.entryPrefix = `${modulePrefix}${modulePrefix.length > 0 ? ' ' : ''}${this.logPrefix}`;
  }

  override fork(options: LoggerForkOptions): ConsoleLogger {
    const level = options.level ?? this.level;
    const module = isDefined(options.subModule) ? [...(this.module ?? []), options.subModule] : this.module;

    return new ConsoleLogger(level, module, isDefined(options.subModule) ? options.prefix : (options.prefix ?? this.logPrefix));
  }

  override subModule(subModule: string): ConsoleLogger {
    return new ConsoleLogger(this.level, [...(this.module ?? []), subModule]);
  }

  override prefix(prefix: string): ConsoleLogger {
    return new ConsoleLogger(this.level, this.module, `${prefix}${this.logPrefix}`);
  }

  protected log(level: LogLevel, entryOrError: string | Error, errorOptions?: LogErrorOptions): void {
    const entry = isString(entryOrError) ? entryOrError : formatError(entryOrError, errorOptions);

    const dateString = now().toISOString();
    console[consoleLevelFuncMap[level]](`${dateString} - ${this.entryPrefix}${entry}`);
  }
}
