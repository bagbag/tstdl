import { mailTemplate } from '#/mail';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import type { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer';
import { jsxTemplateField } from '#/templates/resolvers/jsx.template-resolver';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver';
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

const template = mailTemplate({
  subject: stringTemplateField<HandlebarsTemplateRenderer>({ renderer: 'handlebars', template: 'Hello {{ name }} in subject!' }),
  html: jsxTemplateField<MjmlTemplateRenderer>({ renderer: 'mjml-jsx', template: HelloMail }),
  text: stringTemplateField<HandlebarsTemplateRenderer>({ renderer: 'handlebars', template: 'Hello {{ name }} in text!' })
});

export default template;
