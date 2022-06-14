import type { Template } from './template.model';

export type TemplateRenderResult = string;

export abstract class TemplateRenderer<T extends Template = Template> {
  abstract canHandleType(type: string): boolean;

  abstract render(template: T, context?: object): Promise<TemplateRenderResult>;
}
