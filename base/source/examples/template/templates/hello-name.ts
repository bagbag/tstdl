import { simpleTemplate } from '#/templates';
import type { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import { stringTemplateField } from '#/templates/resolvers/string.template-resolver';
import { assertFunction } from '#/utils/type-guards';

const template = simpleTemplate(
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
