import { Any, any, Class, object, Optional, Property, StringProperty } from '#/schema/index.js';
import type { PickBy, Record, SimplifyObject } from '#/types/index.js';

export type TemplateContext<T extends Template> = Parameters<NonNullable<T[typeof templateContext]>>[0];

declare const templateContext: unique symbol;

@Class({ unknownProperties: any() })
export class TemplateField<Resolver extends string = string, Renderer extends string = string, Options = any, Context extends Record = any> {
  declare readonly [templateContext]?: (context: Context) => void;

  @StringProperty()
  resolver: Resolver;

  @StringProperty()
  renderer: Renderer;

  @Any()
  @Optional()
  options?: Options;
}

export type TemplateFields<Fields extends Record<string, boolean>, Resolver extends string = string, Renderer extends string = string, Options = any, Context extends Record = any> = SimplifyObject<
  & { [P in keyof PickBy<Fields, true>]: TemplateField<Resolver, Renderer, Options, Context>; }
  & { [P in keyof PickBy<Fields, false>]?: TemplateField<Resolver, Renderer, Options, Context>; }
>;

export abstract class Template<Fields extends Record<string, boolean> = Record<string, boolean>, TemplateOptions = any, Context extends Record = any> {
  declare readonly [templateContext]?: (context: Context) => void;

  /** Name of template */
  @StringProperty()
  name: string;

  @Property(object({}, { unknownProperties: TemplateField }))
  fields: TemplateFields<Fields, string, string, any, Context>;

  @Any()
  @Optional()
  options?: TemplateOptions;
}

export function simpleTemplate<Context extends Record = any, Options = any>(name: string, template: TemplateField<string, string, any, Context>, options?: Options): Template<{ template: true }, Options, Context> {
  return {
    name,
    fields: {
      template
    },
    options
  };
}
