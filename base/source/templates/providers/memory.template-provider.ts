import { singleton } from '#/container';
import { isUndefined } from '#/utils/type-guards';
import type { Template } from '../template.model';
import { TemplateProvider } from '../template.provider';

@singleton()
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
