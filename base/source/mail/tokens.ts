import { injectionToken } from '#/injector/index.js';
import type { DefaultMailData } from './models/mail-data.model.js';

export const MAIL_DEFAULT_DATA = injectionToken<DefaultMailData>('DefaultMailData');
