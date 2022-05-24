import { forwardRef, singleton } from '#/container';
import { isDefined } from '#/utils/type-guards';
// @ts-expect-error import is actually working
import * as mjml2html from 'mjml';
import type { MJMLParsingOptions } from 'mjml-core';
import { MailTemplateRendererProvider } from '../mail-template-renderer.provider';
import type { MailTemplateRenderResult } from '../mail-template.renderer';
import { MailTemplateRenderer } from '../mail-template.renderer';
import type { MailTemplate } from '../models';

export type MjmlMailTemplateOptions = Pick<MJMLParsingOptions, 'fonts' | 'keepComments' | 'validationLevel'> & {
  preprocessorOptions?: any
};

export type MjmlMailTemplate = MailTemplate<'mjml' | `mjml-${string}`, MjmlMailTemplateOptions>;

@singleton()
export class MjmlMailTemplateRenderer extends MailTemplateRenderer<MjmlMailTemplate> {
  private readonly rendererProvider: MailTemplateRendererProvider;

  constructor(@forwardRef(() => MailTemplateRendererProvider) rendererProvider: MailTemplateRendererProvider) {
    super();

    this.rendererProvider = rendererProvider;
  }

  canHandleType(type: string): boolean {
    if (type == 'mjml') {
      return true;
    }

    if (!type.startsWith('mjml-')) {
      return false;
    }

    const parent = type.slice(5);
    return this.rendererProvider.has(parent);
  }

  async render(template: MjmlMailTemplate, context?: object): Promise<MailTemplateRenderResult> {
    if (template.type.length > 4) {
      const parent = template.type.slice(5);
      const renderer = this.rendererProvider.get(parent);

      const { subject, html, text } = await renderer.render({ ...template, type: parent, options: template.options?.preprocessorOptions }, context);

      const preprocessedTemplate: MjmlMailTemplate = {
        ...template,
        type: 'mjml',
        subject,
        html,
        text
      };

      return this.render(preprocessedTemplate);
    }

    const html = isDefined(template.html) ? mjml2html(template.html).html : undefined;

    return {
      subject: template.subject,
      html,
      text: template.text
    };
  }
}
