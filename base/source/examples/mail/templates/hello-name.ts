import { mailTemplate } from '#/mail';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import type { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver';

const template = mailTemplate({
  subject: stringTemplateField<HandlebarsTemplateRenderer>({ renderer: 'handlebars', template: 'Hello {{ name }} in subject!' }),
  html: stringTemplateField<MjmlTemplateRenderer>({ renderer: 'mjml-handlebars', template: '<mjml>\n<mj-body>\n<mj-section>\n<mj-column>\n<mj-text font-size="20px" color="#F45E43" font-family="helvetica">Hello {{ name }} in html!</mj-text>\n</mj-column>\n</mj-section>\n</mj-body>\n</mjml>' }),
  text: stringTemplateField<HandlebarsTemplateRenderer>({ renderer: 'handlebars', template: 'Hello {{ name }} in text!' })
});

export default template;
