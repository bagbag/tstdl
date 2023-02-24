import { singleton } from '#/container/index.js';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer.js';
import { TemplateRenderer } from '../template.renderer.js';

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
