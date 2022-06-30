import { optional, singleton } from '#/container';
import { _throw } from '#/utils/helpers';
import { isString } from '#/utils/type-guards';
import { TemplateRendererProvider } from './template-renderer.provider';
import type { Template } from './template.model';
import type { TemplateProvider } from './template.provider';
import type { TemplateRenderResult } from './template.renderer';

@singleton()
export class TemplateService {
  private readonly templateProvider: TemplateProvider;
  private readonly templateRendererProvider: TemplateRendererProvider;

  constructor(@optional() templateProvider: TemplateProvider | undefined, templateRendererProvider: TemplateRendererProvider) {
    this.templateProvider = templateProvider ?? { get: () => _throw(new Error('No template provider provided. Cannot render template-keys.')) };
    this.templateRendererProvider = templateRendererProvider;
  }

  async render(key: string, templateContext?: object): Promise<TemplateRenderResult>;
  async render<T extends Template = Template>(template: T, templateContext?: object): Promise<TemplateRenderResult>;
  async render<T extends Template = Template>(keyOrTemplate: string | T, templateContext?: object): Promise<TemplateRenderResult> {
    const template = isString(keyOrTemplate) ? await this.templateProvider.get(keyOrTemplate) : keyOrTemplate;
    const renderer = this.templateRendererProvider.get(template.type);
    return renderer.render(template, templateContext);
  }
}
