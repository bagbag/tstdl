import { simpleTemplate } from '#/templates';
import type { JsxTemplateRenderer } from '#/templates/renderers/jsx.template-renderer';
import { jsxTemplateField } from '#/templates/resolvers/jsx.template-resolver';
import type { VNode } from 'preact';

function HelloJsx({ name }: { name: string }): VNode {
  return <h1>Hello {name}!</h1>;
}

export const template = simpleTemplate(
  jsxTemplateField<JsxTemplateRenderer>({
    renderer: 'jsx',
    template: HelloJsx
  })
);

export default template;
