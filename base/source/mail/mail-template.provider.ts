import type { MailTemplate } from './models';

export abstract class MailTemplateProvider {
  abstract get(key: string): Promise<MailTemplate>;
}
