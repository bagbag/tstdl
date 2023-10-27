import { Singleton } from '#/injector/decorators.js';
import { Property } from '#/schema/index.js';
import type { PartialProperty, Record, TypedOmit } from '#/types.js';
import type { ComponentClass, FunctionComponent } from 'preact';
import { TemplateField } from '../template.model.js';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer.js';
import { TemplateResolver } from '../template.resolver.js';

export type JsxTemplate<Context extends Record = any> = FunctionComponent<Context> | ComponentClass<Context, any>;

export class JsxTemplateField<Renderer extends string = string, Options = any, Context extends Record = any> extends TemplateField<'string', Renderer, Options, Context> {
  @Property()
  template: JsxTemplate<Context>;
}

@Singleton()
export class JsxTemplateResolver extends TemplateResolver<JsxTemplateField, JsxTemplate> {
  constructor() {
    super();
  }

  canHandle(resolver: string): boolean {
    return (resolver == 'jsx');
  }

  resolve(field: JsxTemplateField): JsxTemplate {
    return field.template;
  }
}

export function jsxTemplateField<Renderer extends TemplateRenderer, Context extends Record = any>(field: PartialProperty<TypedOmit<JsxTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions], Context>, 'resolver'>, 'renderer'>): JsxTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions], Context> {
  return { resolver: 'string', renderer: 'jsx', ...field };
}
