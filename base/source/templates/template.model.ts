import { Any, any, object, Optional, Property, Class } from '#/schema';
import type { PickBy, Record, SimplifyObject } from '#/types';

@Class({ allowUnknownProperties: any() })
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

export abstract class Template<Fields extends Record<string, boolean> = Record<string, boolean>, TemplateOptions = any> {
  @Property({ schema: object({}, { allowUnknownProperties: TemplateField }) })
  fields: TemplateFields<Fields>;

  @Any()
  @Optional()
  options?: TemplateOptions;
}

export function simpleTemplate(template: TemplateField): Template {
  return {
    fields: {
      template
    }
  };
}
