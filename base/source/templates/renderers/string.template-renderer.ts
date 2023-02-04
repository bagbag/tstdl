import { singleton } from '#/container';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer';
import { TemplateRenderer } from '../template.renderer';

export type StringTemplateRenderObject = TemplateRenderObject<'string', undefined, string>;

@singleton()
export class StringTemplateRenderer extends TemplateRenderer<'string', undefined> {
  constructor() {
    super();
  }

  canHandleType(type: string): boolean {
    return (type == 'string');
  }

  _render({ template }: StringTemplateRenderObject, _context?: object): TemplateRenderResult {
    return template;
  }
}
