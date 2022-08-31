import { pdfTemplate } from '#/pdf';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import { fileTemplateField } from '#/templates/resolvers/file.template-resolver';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver';
import { resolve } from 'path';

const template = pdfTemplate({
  body: fileTemplateField<HandlebarsTemplateRenderer>({
    renderer: 'handlebars',
    templateFile: resolve(__dirname.replace('dist', 'source'), 'hello-name.hbs')
  }),
  header: stringTemplateField<HandlebarsTemplateRenderer>({
    renderer: 'handlebars',
    template: '<div></div>'
  })
});

export default template;
