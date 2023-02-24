import { singleton } from '#/container/index.js';
import { Property } from '#/schema/index.js';
import type { TypedOmit } from '#/types.js';
import type { ComponentClass, FunctionComponent } from 'preact';
import { TemplateField } from '../template.model.js';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer.js';
import { TemplateResolver } from '../template.resolver.js';

export type JsxTemplate = FunctionComponent<any> | ComponentClass<any, any>;

export class JsxTemplateField<Renderer extends string = string, Options = any> extends TemplateField<'string', Renderer, Options> {
  @Property()
  template: JsxTemplate;
}

@singleton()
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

export function jsxTemplateField<Renderer extends TemplateRenderer>(field: TypedOmit<JsxTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]>, 'resolver'>): JsxTemplateField<Renderer[TemplateRendererString], Renderer[TemplateRendererOptions]> {
  return { resolver: 'string', ...field };
}
