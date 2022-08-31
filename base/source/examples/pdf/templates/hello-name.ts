import { pdfTemplate } from '#/pdf';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import type { StringTemplateRenderer } from '#/templates/renderers/string.template-renderer';
import { fileTemplateField } from '#/templates/resolvers/file.template-resolver';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver';
import { resolve } from 'path';

const template = pdfTemplate({
  body: fileTemplateField<HandlebarsTemplateRenderer>({
    renderer: 'handlebars',
    templateFile: resolve(__dirname.replace('dist', 'source'), 'hello-name.hbs')
  }),
  header: stringTemplateField<StringTemplateRenderer>({
    renderer: 'string',
    template: '<div>PDF Header</div>'
  }),
  footer: stringTemplateField<StringTemplateRenderer>({
    renderer: 'string',
    template: '<div>PDF Footer</div>'
  })
});

export default template;
