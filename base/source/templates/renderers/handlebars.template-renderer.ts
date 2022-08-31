import { singleton } from '#/container';
import type { ObjectLiteral, Record } from '#/types';
import { memoizeSingle } from '#/utils/function/memoize';
import { mapObjectValues, mapObjectValuesAsync } from '#/utils/object/object';
import { isDefined, isFunction, isString } from '#/utils/type-guards';
import * as handlebars from 'handlebars';
import { TemplateResolverProvider } from '../template-resolver.provider';
import type { TemplateField } from '../template.model';
import type { TemplateRenderObject } from '../template.renderer';
import { TemplateRenderer } from '../template.renderer';

export type HandlebarsTemplateHelperOptionsLocationItem = { line: number, column: number };

export type HandlebarsTemplateHelperOptionsLocation = {
  start: HandlebarsTemplateHelperOptionsLocationItem,
  end: HandlebarsTemplateHelperOptionsLocationItem
};

export type HandlebarsTemplateHelperOptions = {
  name: string,
  location?: HandlebarsTemplateHelperOptionsLocation,
  data?: Record<string>,
  hash: Record<string>,
  lookupProperty: (object: ObjectLiteral, propertyName: string) => unknown,
  fn?: handlebars.TemplateDelegate,
  inverse?: handlebars.TemplateDelegate
};

export type HandlebarsTemplateHelper = (context: unknown, args: unknown[], options: HandlebarsTemplateHelperOptions) => any;
export type HandlebarsTemplateHelpersObject = Record<string, HandlebarsTemplateHelper>;

export type HandlebarsTemplatePartial = string | TemplateField<string, 'handlebars', HandlebarsRendererOptions> | handlebars.TemplateDelegate;
export type HandlebarsTemplatePartialsObject = Record<string, HandlebarsTemplatePartial>;

export type HandlebarsRendererOptions = {
  strict?: boolean,
  preventIndent?: boolean,
  helpers?: HandlebarsTemplateHelpersObject,
  partials?: HandlebarsTemplatePartialsObject
};

export type HandlebarsTemplateRenderObject = TemplateRenderObject<'handlebars', HandlebarsRendererOptions>;

const wrapHandlebarsTemplateHelper = memoizeSingle(_wrapHandlebarsTemplateHelper, { weak: true });

@singleton()
export class HandlebarsTemplateRenderer extends TemplateRenderer<'handlebars', HandlebarsRendererOptions> {
  private readonly templateResolverProvider: TemplateResolverProvider;
  private readonly compileHandlebarsTemplate: typeof this._compileHandlebarsTemplate;

  constructor(templateResolverProvider: TemplateResolverProvider) {
    super();

    this.templateResolverProvider = templateResolverProvider;
    this.compileHandlebarsTemplate = memoizeSingle(this._compileHandlebarsTemplate, { weak: true }); // eslint-disable-line @typescript-eslint/unbound-method
  }

  canHandleType(type: string): boolean {
    return type == 'handlebars';
  }

  async _render(renderObject: HandlebarsTemplateRenderObject, context?: object): Promise<string> {
    const renderer = await this.compileHandlebarsTemplate(renderObject);
    return renderer(context);
  }

  private async _compileHandlebarsTemplate({ template, options = {} }: HandlebarsTemplateRenderObject): Promise<handlebars.TemplateDelegate> {
    const renderer = handlebars.compile(template, {
      strict: options.strict ?? true,
      preventIndent: options.preventIndent,
      knownHelpers: isDefined(options.helpers) ? mapObjectValues(options.helpers, () => true) : undefined,
      knownHelpersOnly: true
    });

    const wrappedHelpers = isDefined(options.helpers) ? mapObjectValues(options.helpers, wrapHandlebarsTemplateHelper) : undefined;
    const normalizedPartials = isDefined(options.partials) ? await mapObjectValuesAsync(options.partials, async (partial) => this.normalizePartial(partial)) : undefined;

    return (context?: any, runtimeOptions?: handlebars.RuntimeOptions) => renderer(context, { helpers: wrappedHelpers, partials: normalizedPartials, ...runtimeOptions });
  }

  private async normalizePartial(partial: HandlebarsTemplatePartial): Promise<handlebars.TemplateDelegate> {
    if (isString(partial)) {
      return this.compileHandlebarsTemplate({ renderer: 'handlebars', template: partial });
    }

    if (isFunction(partial)) {
      return partial;
    }

    const resolver = this.templateResolverProvider.get(partial.resolver);
    const template = await resolver.resolve(partial);

    return this.compileHandlebarsTemplate({ renderer: 'handlebars', template, options: partial.options });
  }
}

function _wrapHandlebarsTemplateHelper(helper: HandlebarsTemplateHelper): handlebars.HelperDelegate {
  function wrapper(context: unknown, ...argsAndOptions: any[]): any {
    const args = argsAndOptions.slice(0, -1);
    const options = argsAndOptions[argsAndOptions.length - 1] as HandlebarsTemplateHelperOptions;

    helper(context, args, options);
  }

  return wrapper;
}
