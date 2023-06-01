import type { SchemaTestable } from '#/schema/index.js';
import { Schema } from '#/schema/index.js';
import type { Record } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';

export type TemplateRenderResult = string;

export type TemplateRenderObject<Renderer extends string = string, Options = any, V = unknown> = {
  renderer: Renderer,
  template: V,
  contextSchema?: SchemaTestable<Record>,
  options?: Options
};

export type TemplateRendererString = typeof templateRendererString;
export type TemplateRendererOptions = typeof templateRendererOptions;

export const templateRendererString: unique symbol = Symbol('templateRendererString');
export const templateRendererOptions: unique symbol = Symbol('templateRendererOptions');

export abstract class TemplateRenderer<Renderer extends string = string, Options = any> {
  declare readonly [templateRendererString]: Renderer;
  declare readonly [templateRendererOptions]: Options;

  async render(template: TemplateRenderObject<Renderer, Options>, context?: Record): Promise<TemplateRenderResult> {
    const parsedContext = isDefined(template.contextSchema)
      ? Schema.parse(template.contextSchema, context)
      : context;

    return this._render(template, parsedContext ?? {});
  }

  abstract canHandleType(type: string): boolean;

  protected abstract _render(renderObject: TemplateRenderObject<Renderer, Options>, context: Record): TemplateRenderResult | Promise<TemplateRenderResult>;
}
