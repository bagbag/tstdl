import { singleton } from '#/container/index.js';
import { Union } from '#/schema/index.js';
import type { Record, TypedOmit } from '#/types.js';
import { TemplateField } from '../template.model.js';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer.js';
import { TemplateResolver } from '../template.resolver.js';

export type StringTemplate = string | ((context: Record) => string | Promise<string>);

export class StringTemplateField<Renderer extends string = string, Options = any> extends TemplateField<'string', Renderer, Options> {
  @Union(String, Function)
  template: StringTemplate;
}

@singleton()
export class StringTemplateResolver extends TemplateResolver<StringTemplateField> {
  constructor() {
    super();
  }

  canHandle(resolver: string): boolean {
    return (resolver == 'string');
  }

  resolve(field: StringTemplateField): StringTemplate {
    return field.template;
  }
}

export function stringTemplateField<Renderer extends TemplateRenderer>(field: TypedOmit<StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]>, 'resolver'>): StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]> {
  return { resolver: 'string', ...field };
}
