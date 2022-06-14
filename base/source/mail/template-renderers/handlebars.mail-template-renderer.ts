import { singleton } from '#/container';
import { configureTemplates } from '#/templates';
import type { HandlebarsTemplate, HandlebarsTemplateOptions } from '#/templates/renderers/handlebars.template-renderer';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import { isDefined } from '#/utils/type-guards';
import type { MailTemplateRenderResult } from '../mail-template.renderer';
import { MailTemplateRenderer } from '../mail-template.renderer';
import type { MailTemplate } from '../models';

export type HandlebarsMailTemplateOptions = HandlebarsTemplateOptions;

export type HandlebarsMailTemplate = MailTemplate<HandlebarsTemplate['type'], HandlebarsMailTemplateOptions>;

configureTemplates({ templateRenderers: [HandlebarsTemplateRenderer] });

@singleton()
export class HandlebarsMailTemplateRenderer extends MailTemplateRenderer<HandlebarsMailTemplate> {
  private readonly handlebarsTemplateRenderer: HandlebarsTemplateRenderer;

  constructor(handlebarsTemplateRenderer: HandlebarsTemplateRenderer) {
    super();

    this.handlebarsTemplateRenderer = handlebarsTemplateRenderer;
  }

  canHandleType(type: string): boolean {
    return this.handlebarsTemplateRenderer.canHandleType(type);
  }

  async render(template: HandlebarsMailTemplate, context?: object): Promise<MailTemplateRenderResult> {
    const subject = isDefined(template.subject)
      ? await this.handlebarsTemplateRenderer.render({ type: template.type, template: template.subject, options: template.options }, context)
      : undefined;

    const html = isDefined(template.html)
      ? await this.handlebarsTemplateRenderer.render({ type: template.type, template: template.html, options: template.options }, context)
      : undefined;

    const text = isDefined(template.text)
      ? await this.handlebarsTemplateRenderer.render({ type: template.type, template: template.text, options: template.options }, context)
      : undefined;

    return {
      subject,
      html,
      text
    };
  }
}
