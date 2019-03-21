import { LogLevel } from './level';

export type LogEntry = string;
export type LoggerStatic = new (level: LogLevel) => Logger;

export interface Logger {
  prefix(prefix: string): Logger;
  error(error: Error, includeStack?: boolean): void;
  error(entry: LogEntry): void;
  warn(entry: LogEntry): void;
  info(entry: LogEntry): void;
  verbose(entry: LogEntry): void;
  debug(entry: LogEntry): void;
  trace(entry: LogEntry): void;
}
