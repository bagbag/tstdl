import { injectionToken } from '#/container';
import type { MailClientConfig } from './mail.client';
import type { DefaultMailData } from './models';

export const MAIL_CLIENT_CONFIG = injectionToken<MailClientConfig>('MAIL_CLIENT_CONFIG');

export const MAIL_DEFAULT_DATA = injectionToken<DefaultMailData>('MAIL_DEFAULT_DATA');
