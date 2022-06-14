import { singleton } from '#/container';
import * as handlebars from 'handlebars';
import type { Template } from '../template.model';
import type { TemplateRenderResult } from '../template.renderer';
import { TemplateRenderer } from '../template.renderer';

export type HandlebarsTemplateOptions = { strict?: boolean };

export type HandlebarsTemplate = Template<'handlebars', HandlebarsTemplateOptions>;

@singleton()
export class HandlebarsTemplateRenderer extends TemplateRenderer<HandlebarsTemplate> {
  canHandleType(type: string): boolean {
    return type == 'handlebars';
  }

  async render(template: HandlebarsTemplate, context?: object): Promise<TemplateRenderResult> {
    const renderer = handlebars.compile(template.template, { strict: template.options?.strict ?? true });
    return renderer(context);
  }
}
