import { injectionToken } from '#/injector/token.js';
import type { LogLevel } from './level.js';

export const LOG_LEVEL = injectionToken<LogLevel>('log level');
