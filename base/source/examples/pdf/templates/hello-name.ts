import { pdfTemplate } from '#/pdf';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import type { StringTemplateRenderer } from '#/templates/renderers/string.template-renderer';
import { fileTemplateField } from '#/templates/resolvers/file.template-resolver';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver';
import { resolve } from 'path';

function reverse(value: unknown): string {
  return (value as string).split('').reverse().join('');
}

const template = pdfTemplate({
  body: fileTemplateField<HandlebarsTemplateRenderer>({
    renderer: 'handlebars',
    templateFile: resolve(__dirname.replace('dist', 'source'), 'hello-name.hbs'),
    options: {
      partials: {
        sometext: stringTemplateField<HandlebarsTemplateRenderer>({
          renderer: 'handlebars',
          template: '{{ reverse "Hallo Welt!" }}',
          options: {
            helpers: { reverse }
          }
        })
      }
    }
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
