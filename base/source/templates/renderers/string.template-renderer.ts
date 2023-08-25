import { Singleton } from '#/injector/decorators.js';
import type { Record } from '#/types.js';
import { isString } from '#/utils/type-guards.js';
import type { StringTemplate } from '../resolvers/string.template-resolver.js';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer.js';
import { TemplateRenderer } from '../template.renderer.js';

export type StringTemplateRenderObject = TemplateRenderObject<'string', undefined, StringTemplate>;

@Singleton()
export class StringTemplateRenderer extends TemplateRenderer<'string', undefined> {
  constructor() {
    super();
  }

  canHandleType(type: string): boolean {
    return (type == 'string');
  }

  async _render({ template }: StringTemplateRenderObject, context: Record): Promise<TemplateRenderResult> {
    if (isString(template)) {
      return template;
    }

    return template(context);
  }
}
