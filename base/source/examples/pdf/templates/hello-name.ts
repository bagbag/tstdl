import { pdfTemplate } from '#/pdf/pdf.service.js';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import type { StringTemplateRenderer } from '#/templates/renderers/string.template-renderer.js';
import { fileTemplateField } from '#/templates/resolvers/file.template-resolver.js';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver.js';
import { resolve } from 'node:path';

function reverse(value: unknown): string {
  return (value as string).split('').reverse().join('');
}

const template = pdfTemplate('hello-name', {
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
