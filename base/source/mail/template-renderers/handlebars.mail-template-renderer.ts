import { singleton } from '#/container';
import { isDefined } from '#/utils/type-guards';
import * as handlebars from 'handlebars';
import type { MailTemplateRenderResult } from '../mail-template.renderer';
import { MailTemplateRenderer } from '../mail-template.renderer';
import type { MailTemplate } from '../models';

export type HandlebarsMailTemplateOptions = { strict?: boolean };

export type HandlebarsMailTemplate = MailTemplate<'handlebars', HandlebarsMailTemplateOptions>;

@singleton()
export class HandlebarsMailTemplateRenderer extends MailTemplateRenderer<HandlebarsMailTemplate> {
  canHandleType(type: string): boolean {
    return type == 'handlebars';
  }

  async render(template: HandlebarsMailTemplate, context?: object): Promise<MailTemplateRenderResult> {
    const subjectRenderer = isDefined(template.subject) ? handlebars.compile(template.subject, { strict: template.options?.strict ?? true }) : undefined;
    const htmlRenderer = isDefined(template.html) ? handlebars.compile(template.html, { strict: template.options?.strict ?? true }) : undefined;
    const textRenderer = isDefined(template.text) ? handlebars.compile(template.text, { strict: template.options?.strict ?? true }) : undefined;

    return {
      subject: subjectRenderer?.(context),
      html: htmlRenderer?.(context),
      text: textRenderer?.(context)
    };
  }
}
