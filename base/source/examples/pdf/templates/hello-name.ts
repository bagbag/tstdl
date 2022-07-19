import { fileTemplate } from '#/templates/providers/file-template.provider';
import { resolve } from 'path';

const template = fileTemplate({
  type: 'mjml-handlebars',
  templateFile: resolve(__dirname.replace('dist', 'source'), 'hello-name.hbs')
});

export default template;
