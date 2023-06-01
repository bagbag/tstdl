import { Any, any, Class, object, Optional, Property } from '#/schema/index.js';
import type { PickBy, Record, SimplifyObject } from '#/types.js';

export type TemplateContext<T extends Template> = Parameters<NonNullable<T[typeof templateContext]>>[0];

declare const templateContext: unique symbol;

@Class({ unknownProperties: any() })
export class TemplateField<Resolver extends string = string, Renderer extends string = string, Options = any, Context extends Record = any> {
  declare readonly [templateContext]?: (context: Context) => void;

  @Property()
  resolver: Resolver;

  @Property()
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

  /** name of template */
  @Property()
  name: string;

  @Property({ schema: object({}, { unknownProperties: TemplateField }) })
  fields: TemplateFields<Fields, string, string, any, Context>;

  @Any()
  @Optional()
  options?: TemplateOptions;
}

export function simpleTemplate(name: string, template: TemplateField): Template {
  return {
    name,
    fields: {
      template
    }
  };
}
