import type { JsxTemplateRenderer } from '#/templates/renderers/jsx.template-renderer.js';
import { jsxTemplateField } from '#/templates/resolvers/jsx.template-resolver.js';
import { simpleTemplate } from '#/templates/template.model.js';
import type { VNode } from 'preact';

function HelloJsx({ name }: { name: string }): VNode {
  return <h1>Hello {name}!</h1>;
}

export const template = simpleTemplate('hello-jsx',
  jsxTemplateField<JsxTemplateRenderer>({
    renderer: 'jsx',
    template: HelloJsx
  })
);

export default template;
