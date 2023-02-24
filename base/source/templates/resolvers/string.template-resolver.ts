import { singleton } from '#/container/index.js';
import { Property } from '#/schema/index.js';
import type { TypedOmit } from '#/types.js';
import { TemplateField } from '../template.model.js';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer.js';
import { TemplateResolver } from '../template.resolver.js';

export class StringTemplateField<Renderer extends string = string, Options = any> extends TemplateField<'string', Renderer, Options> {
  @Property()
  template: string;
}

@singleton()
export class StringTemplateResolver extends TemplateResolver<StringTemplateField> {
  constructor() {
    super();
  }

  canHandle(resolver: string): boolean {
    return (resolver == 'string');
  }

  resolve(field: StringTemplateField): string {
    return field.template;
  }
}

export function stringTemplateField<Renderer extends TemplateRenderer>(field: TypedOmit<StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]>, 'resolver'>): StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]> {
  return { resolver: 'string', ...field };
}
