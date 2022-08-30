import { singleton } from '#/container';
import type { Record } from '#/types';
import { memoizeSingle } from '#/utils/function/memoize';
import { mapObjectValues } from '#/utils/object/object';
import { isDefined, isFunction, isString } from '#/utils/type-guards';
import * as handlebars from 'handlebars';
import type { Template } from '../template.model';
import type { TemplateRenderResult } from '../template.renderer';
import { TemplateRenderer } from '../template.renderer';

export type HandlebarsTemplateHelper = handlebars.HelperDelegate;
export type HandlebarsTemplateHelpersObject = Record<string, HandlebarsTemplateHelper>;

export type HandlebarsTemplatePartial = string | HandlebarsTemplate | handlebars.TemplateDelegate;
export type HandlebarsTemplatePartialsObject = Record<string, HandlebarsTemplatePartial>;

export type HandlebarsTemplateOptions = {
  strict?: boolean,
  preventIndent?: boolean,
  helpers?: HandlebarsTemplateHelpersObject,
  partials?: HandlebarsTemplatePartialsObject
};

export type HandlebarsTemplate = Template<'handlebars', HandlebarsTemplateOptions>;

const compileHandlebarsTemplate = memoizeSingle(_compileHandlebarsTemplate);

@singleton()
export class HandlebarsTemplateRenderer extends TemplateRenderer<HandlebarsTemplate> {
  canHandleType(type: string): boolean {
    return type == 'handlebars';
  }

  async render(template: HandlebarsTemplate, context?: object): Promise<TemplateRenderResult> {
    const renderer = compileHandlebarsTemplate(template);
    return renderer(context);
  }
}

export function handlebarsTemplateOptions<T extends HandlebarsTemplateOptions>(options: T): T {
  return options;
}

export function handlebarsTemplate<T extends HandlebarsTemplate = HandlebarsTemplate>(template: T): T {
  return template;
}

function _compileHandlebarsTemplate({ template, options = {} }: HandlebarsTemplate): (context?: any, options?: handlebars.RuntimeOptions) => string {
  const renderer = handlebars.compile(template, {
    strict: options.strict ?? true,
    preventIndent: options.preventIndent,
    knownHelpers: isDefined(options.helpers) ? mapObjectValues(options.helpers, () => true) : undefined,
    knownHelpersOnly: true
  });

  const normalizedPartials = isDefined(options.partials) ? mapObjectValues(options.partials, normalizePartial) : undefined;

  return (context?: any, runtimeOptions?: handlebars.RuntimeOptions) => renderer(context, { helpers: options.helpers, partials: normalizedPartials, ...runtimeOptions });
}

function normalizePartial(partial: HandlebarsTemplatePartial): handlebars.TemplateDelegate {
  if (isString(partial)) {
    return compileHandlebarsTemplate({ type: 'handlebars', template: partial });
  }

  if (isFunction(partial)) {
    return partial;
  }

  return compileHandlebarsTemplate(partial);
}
