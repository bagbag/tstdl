import { singleton } from '#/container';
import { assertNotNull } from '#/utils/type-guards';
import type { ComponentClass } from 'preact';
import { Component } from 'preact';
import { render } from 'preact-render-to-string';
import type { JsxTemplate } from '../resolvers/jsx.template-resolver';
import type { TemplateRenderObject, TemplateRenderResult } from '../template.renderer';
import { TemplateRenderer } from '../template.renderer';

declare module 'preact/src/jsx' {
  namespace JSXInternal { // eslint-disable-line @typescript-eslint/no-namespace
    interface IntrinsicElements { // eslint-disable-line @typescript-eslint/consistent-indexed-object-style
      [key: string]: any;
    }
  }
}

export type JsxTemplateRenderObject = TemplateRenderObject<'jsx', undefined, JsxTemplate>;

@singleton()
export class JsxTemplateRenderer extends TemplateRenderer<'jsx', undefined> {
  constructor() {
    super();
  }

  canHandleType(type: string): boolean {
    return (type == 'jsx');
  }

  _render({ template }: JsxTemplateRenderObject, context?: object): TemplateRenderResult {
    const node = isComponentClass(template) ? <template {...context}></template> : template(context, context);
    assertNotNull(node, 'Template returned null');

    return render(node);
  }
}

function isComponentClass(template: JsxTemplate): template is ComponentClass<any, any> {
  return Reflect.getPrototypeOf(template) == Component;
}
