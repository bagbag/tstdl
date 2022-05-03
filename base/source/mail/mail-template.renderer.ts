import type { MailTemplate } from './models';

export type MailTemplateRenderResult = {
  subject: string | undefined,
  html: string | undefined,
  text: string | undefined
};

export abstract class MailTemplateRenderer<T extends MailTemplate = MailTemplate> {
  abstract canHandleType(type: string): boolean;

  abstract render(template: T, context?: object): Promise<MailTemplateRenderResult>;
}
