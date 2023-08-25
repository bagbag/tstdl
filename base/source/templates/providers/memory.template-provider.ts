import { Singleton } from '#/injector/decorators.js';
import { isUndefined } from '#/utils/type-guards.js';
import type { Template } from '../template.model.js';
import { TemplateProvider } from '../template.provider.js';

@Singleton()
export class MemoryTemplateProvider extends TemplateProvider {
  private readonly map: Map<string, Template>;

  constructor() {
    super();

    this.map = new Map();
  }

  add(key: string, template: Template): void {
    this.map.set(key, template);
  }

  get(key: string): Template {
    const template = this.map.get(key);

    if (isUndefined(template)) {
      throw new Error(`Template ${key} not available.`);
    }

    return template;
  }
}
