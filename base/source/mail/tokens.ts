import { injectionToken } from '#/container';
import type { MailClientConfig } from './mail.client';

export const MAIL_CLIENT_CONFIG = injectionToken<MailClientConfig>('MAIL_CLIENT_CONFIG');
