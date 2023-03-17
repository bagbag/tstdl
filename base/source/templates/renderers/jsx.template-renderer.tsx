import { singleton } from '#/container/index.js';
import { assertNotNull } from '#/utils/type-guards.js';
import type { ComponentClass } from 'preact';
import { Component } from 'preact';
import { render } from 'preact-render-to-string';
import type { JsxTemplate } from '../resolvers/jsx.template-resolver.js';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer.js';
import { TemplateRenderer } from '../template.renderer.js';

export type JsxTemplateRenderObject = TemplateRenderObject<'jsx', undefined, JsxTemplate>;

@singleton()
export class JsxTemplateRenderer extends TemplateRenderer<'jsx', undefined> {
  constructor() {
    super();
  }

  canHandleType(type: string): boolean {
    return (type == 'jsx');
  }

  _render({ template: TemplateComponent }: JsxTemplateRenderObject, context?: object): TemplateRenderResult {
    const node = isComponentClass(TemplateComponent) ? <TemplateComponent {...context}></TemplateComponent> : TemplateComponent(context, context);
    assertNotNull(node, 'Template returned null');

    return render(node);
  }
}

function isComponentClass(template: JsxTemplate): template is ComponentClass<any, any> {
  return Reflect.getPrototypeOf(template) == Component;
}
