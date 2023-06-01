import { forwardRef, singleton } from '#/container/index.js';
import type { Record } from '#/types.js';
import mjml2html from 'mjml';
import type { MJMLParsingOptions } from 'mjml-core';
import { TemplateRendererProvider } from '../template-renderer.provider.js';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer.js';
import { TemplateRenderer } from '../template.renderer.js';

export type MjmlRendererOptions = Pick<MJMLParsingOptions, 'fonts' | 'keepComments' | 'validationLevel'> & {
  preprocessorOptions?: any
};

export type MjmlRendererString = 'mjml' | `mjml-${string}`;

export type MjmlTemplateRenderObject = TemplateRenderObject<MjmlRendererString, MjmlRendererOptions, string>;

@singleton()
export class MjmlTemplateRenderer extends TemplateRenderer<MjmlRendererString, MjmlRendererOptions> {
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

  async _render({ renderer, template, options }: MjmlTemplateRenderObject, context: Record): Promise<TemplateRenderResult> {
    if (renderer.length > 4) {
      const parent = renderer.slice(5);
      const parentRenderer = this.rendererProvider.get(parent);

      const result = await parentRenderer.render({ template, renderer: parent, options: options?.preprocessorOptions }, context);

      const preprocessedTemplate: MjmlTemplateRenderObject = {
        renderer: 'mjml',
        template: result
      };

      return this._render(preprocessedTemplate, context);
    }

    return mjml2html(template).html;
  }
}
