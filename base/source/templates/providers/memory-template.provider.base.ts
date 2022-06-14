import { singleton } from '#/container';
import type { TypedOmit } from '#/types';
import { isUndefined } from '#/utils/type-guards';
import type { Template } from '../template.model';

export type MemoryTemplateBase = TypedOmit<Template, 'template'>;

@singleton()
export class MemoryTemplateProviderBase<T extends MemoryTemplateBase> {
  private readonly map: Map<string, T>;

  constructor() {
    this.map = new Map();
  }

  add(key: string, template: T): void {
    this.map.set(key, template);
  }

  async get(key: string): Promise<T> {
    const template = this.map.get(key);

    if (isUndefined(template)) {
      throw new Error(`Template ${key} not available.`);
    }

    return template;
  }
}
