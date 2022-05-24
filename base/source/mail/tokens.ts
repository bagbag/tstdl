import { injectionToken } from '#/container';
import type { Type } from '#/types';
import type { MailTemplateRenderer } from './mail-template.renderer';
import type { MailClientConfig } from './mail.client';

export const MAIL_CLIENT_CONFIG = injectionToken<MailClientConfig>('MAIL_CLIENT_CONFIG');

export const MAIL_TEMPLATE_RENDERERS = injectionToken<Type<MailTemplateRenderer>[]>('MAIL_TEMPLATE_RENDERERS');
