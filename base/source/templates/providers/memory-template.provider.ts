import { singleton } from '#/container';
import type { Template } from '../template.model';
import { MemoryTemplateProviderBase } from './memory-template.provider.base';

@singleton()
export class MemoryTemplateProvider extends MemoryTemplateProviderBase<Template> { }
