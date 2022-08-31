import type { TemplateField } from './template.model';

export abstract class TemplateResolver<T extends TemplateField = TemplateField> {
  abstract canHandle(resolver: string): boolean;
  abstract resolve(field: T): Promise<string>;
}
