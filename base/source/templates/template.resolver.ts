import type { TemplateField } from './template.model.js';

export abstract class TemplateResolver<T extends TemplateField = TemplateField, V = unknown> {
  abstract canHandle(resolver: string): boolean;
  abstract resolve(field: T): V | Promise<V>;
}
