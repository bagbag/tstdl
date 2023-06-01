import { mailTemplate } from '#/mail/index.js';
import { jsxTemplateField } from '#/templates/resolvers/jsx.template-resolver.js';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver.js';
import type { VNode } from 'preact';

type HelloMailContext = {
  name: string
};

function HelloMail({ name }: HelloMailContext): VNode {
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
  subject: stringTemplateField({ renderer: 'handlebars', template: 'Hello {{ name }} in subject!' }),
  html: jsxTemplateField({ renderer: 'mjml-jsx', template: HelloMail }),
  text: stringTemplateField({ renderer: 'string', template: ({ name }: HelloMailContext) => `Hello ${name} in text!` })
});

export default template;
