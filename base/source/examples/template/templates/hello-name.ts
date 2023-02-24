import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver.js';
import { simpleTemplate } from '#/templates/template.model.js';
import { assertFunction } from '#/utils/type-guards.js';

const template = simpleTemplate('hello-name',
  stringTemplateField<HandlebarsTemplateRenderer>({
    renderer: 'handlebars',
    template: '{{#fooBlockHelper this "A test argument"}}{{>fooPartial hobby="Music" }}{{/fooBlockHelper}}',
    options: {
      helpers: {
        fooBlockHelper: (context, args, options) => {
          assertFunction(options.fn, 'fooBlockHelper can only be used as block-helper.');
          console.log({ context, args, options });

          return options.fn(context, options);
        }
      },
      partials: {
        fooPartial: stringTemplateField<HandlebarsTemplateRenderer>({ renderer: 'handlebars', template: 'Hello! <div>{{ name }}</div> <div>{{ hobby }}</div>' })
      }
    }
  })
);

export default template;
