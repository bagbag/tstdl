import { Singleton } from '#/injector/decorators.js';
import { renderJsxAsync } from '#/jsx/render-to-string.js';
import type { Record } from '#/types.js';
import type { JsxTemplate } from '../resolvers/jsx.template-resolver.js';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer.js';
import { TemplateRenderer } from '../template.renderer.js';

export type JsxTemplateRenderObject = TemplateRenderObject<'jsx', undefined, JsxTemplate>;

@Singleton()
export class JsxTemplateRenderer extends TemplateRenderer<'jsx', undefined> {
  constructor() {
    super();
  }

  canHandleType(type: string): boolean {
    return (type == 'jsx');
  }

  async _render({ template }: JsxTemplateRenderObject, context: Record): Promise<TemplateRenderResult> {
    return renderJsxAsync(template, context);
  }
}
