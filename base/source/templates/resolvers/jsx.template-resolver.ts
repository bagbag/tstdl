import { singleton } from '#/container';
import { Property } from '#/schema';
import type { TypedOmit } from '#/types';
import type { ComponentClass, FunctionComponent } from 'preact';
import { TemplateField } from '../template.model';
import type { TemplateRenderer, TemplateRendererOptions, TemplateRendererString } from '../template.renderer';
import { TemplateResolver } from '../template.resolver';

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
