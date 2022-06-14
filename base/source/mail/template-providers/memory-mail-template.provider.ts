import { singleton } from '#/container';
import { MemoryTemplateProviderBase } from '#/templates/providers/memory-template.provider.base';
import type { MailTemplateProvider } from '../mail-template.provider';
import type { MailTemplate } from '../models';

@singleton()
export class MemoryMailTemplateProvider extends MemoryTemplateProviderBase<MailTemplate> implements MailTemplateProvider {
  constructor() {
    super();
  }
}
