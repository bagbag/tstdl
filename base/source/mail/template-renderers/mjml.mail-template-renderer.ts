import { singleton } from '#/container';
import { configureTemplates, TemplateRendererProvider } from '#/templates';
import type { MjmlTemplate, MjmlTemplateOptions } from '#/templates/renderers/mjml.template-renderer';
import { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer';
import { isDefined } from '#/utils/type-guards';
import type { MailTemplateRenderResult } from '../mail-template.renderer';
import { MailTemplateRenderer } from '../mail-template.renderer';
import type { MailTemplate } from '../models';

export type MjmlMailTemplate = MailTemplate<MjmlTemplate['type'], MjmlTemplateOptions>;

configureTemplates({ templateRenderers: [MjmlTemplateRenderer] });

@singleton()
export class MjmlMailTemplateRenderer extends MailTemplateRenderer<MjmlMailTemplate> {
  private readonly rendererProvider: TemplateRendererProvider;
  private readonly mjmlTemplateRenderer: MjmlTemplateRenderer;

  constructor(rendererProvider: TemplateRendererProvider, mjmlTemplateRenderer: MjmlTemplateRenderer) {
    super();

    this.rendererProvider = rendererProvider;
    this.mjmlTemplateRenderer = mjmlTemplateRenderer;
  }

  canHandleType(type: string): boolean {
    return this.mjmlTemplateRenderer.canHandleType(type);
  }

  async render(template: MjmlMailTemplate, context?: object): Promise<MailTemplateRenderResult> {
    if (template.type == 'mjml') {
      const mjmlTemplate: MjmlTemplate | undefined = isDefined(template.html) ? {
        type: template.type,
        template: template.html
      } : undefined;

      const html = isDefined(mjmlTemplate)
        ? await this.mjmlTemplateRenderer.render(mjmlTemplate)
        : undefined;

      return {
        subject: template.subject,
        html,
        text: template.text
      };
    }

    const parent = template.type.slice(5);
    const renderer = this.rendererProvider.get(parent);

    const subject = isDefined(template.subject) ? await renderer.render({ type: parent, template: template.subject, options: template.options?.preprocessorOptions }, context) : undefined;
    const html = isDefined(template.html) ? await renderer.render({ type: parent, template: template.html, options: template.options?.preprocessorOptions }, context) : undefined;
    const text = isDefined(template.text) ? await renderer.render({ type: parent, template: template.text, options: template.options?.preprocessorOptions }, context) : undefined;

    const preprocessedTemplate: MjmlMailTemplate = {
      ...template,
      type: 'mjml',
      subject,
      html,
      text
    };

    return this.render(preprocessedTemplate);
  }
}
