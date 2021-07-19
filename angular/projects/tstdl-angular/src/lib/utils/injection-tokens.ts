import { InjectionToken } from '@angular/core';
import type { Logger } from '@tstdl/base/esm/logger';

export const loggerInjectionToken = new InjectionToken<Logger>('logger');
