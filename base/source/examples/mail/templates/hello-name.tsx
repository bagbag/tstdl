import { mailTemplate } from '#/mail/index.js';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import type { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer.js';
import { jsxTemplateField } from '#/templates/resolvers/jsx.template-resolver.js';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver.js';
import type { VNode } from 'preact';

function HelloMail({ name }: { name: string }): VNode {
  return (
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text font-size="20px" color="#F45E43" font-family="helvetica">Hello {name} in html!</mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  );
}

const template = mailTemplate('hello-name', {
  subject: stringTemplateField<HandlebarsTemplateRenderer>({ renderer: 'handlebars', template: 'Hello {{ name }} in subject!' }),
  html: jsxTemplateField<MjmlTemplateRenderer>({ renderer: 'mjml-jsx', template: HelloMail }),
  text: stringTemplateField<HandlebarsTemplateRenderer>({ renderer: 'handlebars', template: 'Hello {{ name }} in text!' })
});

export default template;
