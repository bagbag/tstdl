import { Singleton } from '#/injector/decorators.js';
import { Union } from '#/schema/index.js';
import type { Record, TypedOmit } from '#/types/index.js';
import { TemplateField } from '../template.model.js';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer.js';
import { TemplateResolver } from '../template.resolver.js';

export type StringTemplate<Context extends Record = any> = string | ((context: Context) => string | Promise<string>);

export class StringTemplateField<Renderer extends string = string, Options = any, Context extends Record = any> extends TemplateField<'string', Renderer, Options, Context> {
  @Union(String, Function)
  template: StringTemplate<Context>;
}

@Singleton()
export class StringTemplateResolver extends TemplateResolver<StringTemplateField> {
  canHandle(resolver: string): boolean {
    return (resolver == 'string');
  }

  resolve(field: StringTemplateField): StringTemplate<Record> {
    return field.template;
  }
}

export function stringTemplateField<Renderer extends TemplateRenderer, Context extends Record = any>(field: TypedOmit<StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions], Context>, 'resolver'>): StringTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions], Context> {
  return { resolver: 'string', ...field };
}
