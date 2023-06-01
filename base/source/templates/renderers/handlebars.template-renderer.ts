import { singleton } from '#/container/index.js';
import type { ObjectLiteral, Record } from '#/types.js';
import { memoizeSingle } from '#/utils/function/memoize.js';
import { hasOwnProperty, mapObjectValues, mapObjectValuesAsync, objectEntries, objectValues } from '#/utils/object/object.js';
import { assertDefined, isDefined, isFunction, isString } from '#/utils/type-guards.js';
import type * as Handlebars from 'handlebars';
import { TemplateResolverProvider } from '../template-resolver.provider.js';
import type { TemplateField } from '../template.model.js';
import type { TemplateRenderObject } from '../template.renderer.js';
import { TemplateRenderer } from '../template.renderer.js';

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
  fn?: Handlebars.TemplateDelegate,
  inverse?: Handlebars.TemplateDelegate
};

export type HandlebarsTemplateHelper = (context: unknown, args: unknown[], options: HandlebarsTemplateHelperOptions) => any;
export type HandlebarsTemplateHelpersObject = Record<string, HandlebarsTemplateHelper>;

export type HandlebarsTemplatePartial = string | TemplateField<string, 'handlebars', HandlebarsRendererOptions> | Handlebars.TemplateDelegate;
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

  async _render(renderObject: HandlebarsTemplateRenderObject, context: Record): Promise<string> {
    const renderer = await this.compileHandlebarsTemplate(renderObject);
    return renderer(context);
  }

  private async _compileHandlebarsTemplate(renderObject: HandlebarsTemplateRenderObject): Promise<Handlebars.TemplateDelegate> {
    const { template, options = {} } = renderObject;

    const allHelpers = getAllPartialHelpersDeep(renderObject);
    const compile = await importHandlebarsCompile();

    const renderer = compile(template, {
      strict: options.strict ?? true,
      preventIndent: options.preventIndent,
      knownHelpers: isDefined(allHelpers) ? mapObjectValues(allHelpers, () => true) : undefined,
      knownHelpersOnly: true
    });

    const wrappedHelpers = isDefined(allHelpers) ? mapObjectValues(allHelpers, wrapHandlebarsTemplateHelper) : undefined;
    const normalizedPartials = isDefined(options.partials) ? await mapObjectValuesAsync(options.partials, async (partial) => this.normalizePartial(partial)) : undefined;

    return (context?: any, runtimeOptions?: Handlebars.RuntimeOptions) => renderer(context, { helpers: wrappedHelpers, partials: normalizedPartials, ...runtimeOptions });
  }

  private async normalizePartial(partial: HandlebarsTemplatePartial): Promise<Handlebars.TemplateDelegate> {
    if (isString(partial) || isFunction(partial)) {
      return partial as Handlebars.TemplateDelegate;
    }

    const resolver = this.templateResolverProvider.get(partial.resolver);
    return resolver.resolve(partial) as Promise<Handlebars.TemplateDelegate>;
  }
}

function _wrapHandlebarsTemplateHelper(helper: HandlebarsTemplateHelper): Handlebars.HelperDelegate {
  const wrapperName = `wrapped${helper.name.slice(0, 1).toUpperCase()}${helper.name.slice(1)}`;

  const wrapper = {
    [wrapperName](context: unknown, ...argsAndOptions: any[]): any {
      const args = argsAndOptions.slice(0, -1);
      const options = argsAndOptions[argsAndOptions.length - 1] as HandlebarsTemplateHelperOptions;

      return helper(context, args, options);
    }
  }[wrapperName]!;

  return wrapper;
}

function getAllPartialHelpersDeep(field: HandlebarsTemplateRenderObject | TemplateField<string, 'handlebars', HandlebarsRendererOptions>): HandlebarsTemplateHelpersObject | undefined {
  const allHelpers = getPartialHelpersDeep(field);
  const helpers: HandlebarsTemplateHelpersObject = {};

  if (allHelpers.length == 0) {
    return undefined;
  }

  for (const [key, helper] of allHelpers) {
    if (hasOwnProperty(helpers, key) && helpers[key] != helper) {
      throw new Error(`Template and partials reference different versions of helper "${key}".`);
    }

    helpers[key] = helper;
  }

  return helpers;
}

function getPartialHelpersDeep(partial: HandlebarsTemplateRenderObject | HandlebarsTemplatePartial): [string, HandlebarsTemplateHelper][] {
  if (isString(partial) || isFunction(partial)) {
    return [];
  }

  const entries = objectEntries(partial.options?.helpers ?? {});
  const childEntries = objectValues(partial.options?.partials ?? {}).flatMap(getPartialHelpersDeep);

  return [...entries, ...childEntries];
}


let handlebarsCompile: (typeof Handlebars)['compile'];

async function importHandlebarsCompile(): Promise<(typeof Handlebars)['compile']> {
  if (isDefined(handlebarsCompile)) {
    return handlebarsCompile;
  }

  const handlebars = await import('handlebars') as any as Partial<typeof Handlebars> & { default?: Partial<typeof Handlebars> };
  const compile = handlebars.compile ?? handlebars.default?.compile;
  assertDefined(compile, 'Could not import handlebars.');

  return (handlebarsCompile = compile); // eslint-disable-line require-atomic-updates
}
