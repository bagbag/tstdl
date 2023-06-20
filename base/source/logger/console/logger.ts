/* eslint-disable no-console */

import { singleton } from '#/container/index.js';
import type { Record } from '#/types.js';
import { now } from '#/utils/date-time.js';
import { formatError } from '#/utils/format-error.js';
import { isDefined, isObject, isString } from '#/utils/type-guards.js';
import { LogLevel } from '../level.js';
import type { LogErrorOptions, LoggerArgument, LoggerForkOptions } from '../logger.js';
import { Logger } from '../logger.js';

const levelFuncMap: Record<LogLevel, (message: string) => void> = {
  [LogLevel.Error]: console.error,
  [LogLevel.Warn]: console.warn,
  [LogLevel.Info]: console.info,
  [LogLevel.Verbose]: console.info,
  [LogLevel.Debug]: console.debug,
  [LogLevel.Trace]: console.debug
};

@singleton<ConsoleLogger, LoggerArgument>({
  provider: {
    useFactory: (argument, context) => new ConsoleLogger(
      (isObject(argument) ? argument.level : undefined) ?? context.resolve(LogLevel),
      isObject(argument) ? argument.module : argument,
      isObject(argument) ? argument.prefix : undefined
    )
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

    return new ConsoleLogger(level, module, options.prefix);
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
    levelFuncMap[level](`${dateString} - ${this.entryPrefix}${entry}`);
  }
}
