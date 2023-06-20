import type { Injectable, resolveArgumentType } from '#/container/index.js';
import { toArray } from '#/utils/array/array.js';
import { isDefined, isFunction } from '#/utils/type-guards.js';
import { LogLevel } from './level.js';

export type LogEntry = string;
export type LogEntryProvider = () => LogEntry;
export type LogEntryOrProvider = LogEntry | LogEntryProvider;
export type LoggerStatic = new (level: LogLevel) => Logger;

export type LogErrorOptions = {
  includeRest?: boolean,
  includeStack?: boolean
};

/** either string as a module shorthand or object */
export type LoggerArgument = string | undefined | {
  level?: LogLevel,
  module?: string | string[],
  prefix?: string
};

export type LoggerForkOptions = {
  subModule?: string,
  prefix?: string,
  level?: LogLevel
};

export abstract class Logger implements Injectable<LoggerArgument> {
  readonly level: LogLevel;
  readonly module?: string[];
  readonly logPrefix: string;

  declare readonly [resolveArgumentType]: LoggerArgument;
  constructor(level: LogLevel, module?: string | string[], prefix: string = '') {
    this.level = level;
    this.module = isDefined(module) ? toArray(module) : undefined;
    this.logPrefix = prefix;
  }

  error(error: Error, options?: LogErrorOptions): void;
  error(entry: LogEntryOrProvider): void;
  error(errorOrEntry: Error | LogEntryOrProvider, options?: LogErrorOptions): void {
    this._log(LogLevel.Error, errorOrEntry, options);
  }

  warn(entry: LogEntryOrProvider): void {
    this._log(LogLevel.Warn, entry);
  }

  info(entry: LogEntryOrProvider): void {
    this._log(LogLevel.Info, entry);
  }

  verbose(entry: LogEntryOrProvider): void {
    this._log(LogLevel.Verbose, entry);
  }

  debug(entry: LogEntryOrProvider): void {
    this._log(LogLevel.Debug, entry);
  }

  trace(entry: LogEntryOrProvider): void {
    this._log(LogLevel.Trace, entry);
  }

  private _log(level: LogLevel, entryOrProvider: LogEntryOrProvider | Error, errorOptions?: LogErrorOptions): void {
    if (this.level < level) {
      return;
    }

    const entry = isFunction(entryOrProvider) ? entryOrProvider() : entryOrProvider;
    this.log(level, entry, errorOptions);
  }

  abstract fork(options: LoggerForkOptions): Logger;

  abstract subModule(subModule: string): Logger;

  abstract prefix(prefix: string): Logger;

  protected abstract log(level: LogLevel, entry: LogEntry | Error, errorOptions?: LogErrorOptions): void;
}
