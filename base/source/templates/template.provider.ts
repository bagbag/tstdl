import type { Template } from './template.model';

export abstract class TemplateProvider {
  abstract get(key: string): Promise<Template>;
}
