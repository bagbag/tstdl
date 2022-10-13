import { singleton } from '#/container';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer';
import { TemplateRenderer } from '../template.renderer';

export type StringTemplateRenderObject = TemplateRenderObject<'string', undefined>;

@singleton()
export class StringTemplateRenderer extends TemplateRenderer<'string', undefined> {
  constructor() {
    super();
  }

  canHandleType(type: string): boolean {
    return (type == 'string');
  }

  async _render({ template }: StringTemplateRenderObject, _context?: object): Promise<TemplateRenderResult> {
    return template;
  }
}
