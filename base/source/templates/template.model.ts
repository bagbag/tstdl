import { Any, any, Class, object, Optional, Property } from '#/schema/index.js';
import type { PickBy, Record, SimplifyObject } from '#/types.js';

export type TemplateContext<T extends Template> = T[typeof templateContext];

export const templateContext: unique symbol = Symbol('templateData');

@Class({ unknownProperties: any() })
export class TemplateField<Resolver extends string = string, Renderer extends string = string, Options = any> {
  @Property()
  resolver: Resolver;

  @Property()
  renderer: Renderer;

  @Any()
  @Optional()
  options?: Options;
}

export type TemplateFields<Fields extends Record<string, boolean>, Resolver extends string = string, Renderer extends string = string, Options = any> = SimplifyObject<
  & { [P in keyof PickBy<Fields, true>]: TemplateField<Resolver, Renderer, Options>; }
  & { [P in keyof PickBy<Fields, false>]?: TemplateField<Resolver, Renderer, Options>; }
>;

export abstract class Template<Fields extends Record<string, boolean> = Record<string, boolean>, TemplateOptions = any, Context extends Record = Record> {
  declare readonly [templateContext]?: Context;

  /** name of template */
  @Property()
  name: string;

  @Property({ schema: object({}, { unknownProperties: TemplateField }) })
  fields: TemplateFields<Fields>;

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
