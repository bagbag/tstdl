import { singleton } from '#/container';
import { isUndefined } from '#/utils/type-guards';
import { MailTemplateProvider } from '../mail-template.provider';
import type { MailTemplate } from '../models';

@singleton()
export class MemoryMailTemplateProvider extends MailTemplateProvider {
  private readonly map: Map<string, MailTemplate>;

  constructor() {
    super();

    this.map = new Map();
  }

  add(template: MailTemplate): void {
    this.map.set(template.key, template);
  }

  async get(key: string): Promise<MailTemplate> {
    const template = this.map.get(key);

    if (isUndefined(template)) {
      throw new Error('template not available');
    }

    return template;
  }
}
