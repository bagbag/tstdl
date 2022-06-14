import { forwardRef, singleton } from '#/container';
// @ts-expect-error import is actually working
import * as mjml2html from 'mjml';
import type { MJMLParsingOptions } from 'mjml-core';
import { TemplateRendererProvider } from '../template-renderer.provider';
import type { Template } from '../template.model';
import type { TemplateRenderResult } from '../template.renderer';
import { TemplateRenderer } from '../template.renderer';

export type MjmlTemplateOptions = Pick<MJMLParsingOptions, 'fonts' | 'keepComments' | 'validationLevel'> & {
  preprocessorOptions?: any
};

export type MjmlTemplate = Template<'mjml' | `mjml-${string}`, MjmlTemplateOptions>;

@singleton()
export class MjmlTemplateRenderer extends TemplateRenderer<MjmlTemplate> {
  private readonly rendererProvider: TemplateRendererProvider;

  constructor(@forwardRef(() => TemplateRendererProvider) rendererProvider: TemplateRendererProvider) {
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

  async render(template: MjmlTemplate, context?: object): Promise<TemplateRenderResult> {
    if (template.type.length > 4) {
      const parent = template.type.slice(5);
      const renderer = this.rendererProvider.get(parent);

      const result = await renderer.render({ ...template, type: parent, options: template.options?.preprocessorOptions }, context);

      const preprocessedTemplate: MjmlTemplate = {
        ...template,
        type: 'mjml',
        template: result
      };

      return this.render(preprocessedTemplate);
    }

    return mjml2html(template.template).html;
  }
}
