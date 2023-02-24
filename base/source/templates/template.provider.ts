import type { Template } from './template.model.js';

export abstract class TemplateProvider {
  abstract get(key: string): Template | Promise<Template>;
}
