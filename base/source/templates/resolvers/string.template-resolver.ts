import { singleton } from '#/container';
import { Property } from '#/schema';
import type { TypedOmit } from '#/types';
import { TemplateField } from '../template.model';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer';
import { TemplateResolver } from '../template.resolver';


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

  async resolve(field: StringTemplateField): Promise<string> {
    return field.template;
  }
}

export function stringTemplateField<Renderer extends TemplateRenderer>(field: TypedOmit<StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]>, 'resolver'>): StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]> {
  return { resolver: 'string', ...field };
}
