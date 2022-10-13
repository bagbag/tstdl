export type TemplateRenderResult = string;

export type TemplateRenderObject<Renderer extends string = string, Options = any> = {
  renderer: Renderer,
  template: string,
  options?: Options
};

export type TemplateRendererString = typeof templateRendererString;
export type TemplateRendererOptions = typeof templateRendererOptions;

export declare const templateRendererString: unique symbol;
export declare const templateRendererOptions: unique symbol;

export abstract class TemplateRenderer<Renderer extends string = string, Options = any> {
  readonly [templateRendererString]: Renderer;
  readonly [templateRendererOptions]: Options;

  async render(template: TemplateRenderObject<Renderer, Options>, context?: object): Promise<TemplateRenderResult> {
    return this._render(template, context);
  }

  abstract canHandleType(type: string): boolean;

  protected abstract _render(renderObject: TemplateRenderObject<Renderer, Options>, context?: object): TemplateRenderResult | Promise<TemplateRenderResult>;
}
