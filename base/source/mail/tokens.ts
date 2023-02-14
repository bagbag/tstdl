import { injectionToken } from '#/container';
import type { DefaultMailData } from './models';

export const MAIL_DEFAULT_DATA = injectionToken<DefaultMailData>('MAIL_DEFAULT_DATA');
