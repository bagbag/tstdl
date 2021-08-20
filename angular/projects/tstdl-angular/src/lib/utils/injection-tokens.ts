import { InjectionToken } from '@angular/core';
import type { Logger } from '@tstdl/base/cjs/logger';

export const loggerInjectionToken = new InjectionToken<Logger>('logger');
