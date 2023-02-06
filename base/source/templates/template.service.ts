import { inject, optional, singleton } from '#/container';
import type { Record } from '#/types';
import { objectEntries } from '#/utils/object/object';
import { _throw } from '#/utils/throw';
import { isString } from '#/utils/type-guards';
import { TemplateRendererProvider } from './template-renderer.provider';
import { TemplateResolverProvider } from './template-resolver.provider';
import type { Template } from './template.model';
import { TemplateProvider } from './template.provider';

export type TemplateServiceRenderResult<T extends Template = Template> = {
  name: string,
  fields: Record<keyof T['fields'], string>,
  options: T['options']
};

@singleton()
export class TemplateService {
  private readonly templateProvider: TemplateProvider;
  private readonly templateRendererProvider: TemplateRendererProvider;
  private readonly templateResolverProvider: TemplateResolverProvider;

  constructor(
    @optional() @inject(TemplateProvider) templateProvider: TemplateProvider | undefined,
    templateRendererProvider: TemplateRendererProvider,
    templateResolverProvider: TemplateResolverProvider
  ) {
    this.templateProvider = templateProvider ?? { get: () => _throw(new Error('No template provider provided. Cannot render template-keys.')) };
    this.templateRendererProvider = templateRendererProvider;
    this.templateResolverProvider = templateResolverProvider;
  }

  async get<T extends Template = Template>(key: string): Promise<T> {
    const template = await this.templateProvider.get(key);
    return template as T;
  }

  async render<T extends Template = Template>(keyOrTemplate: string | T, templateContext?: object): Promise<TemplateServiceRenderResult<T>> {
    const template = isString(keyOrTemplate) ? await this.get(keyOrTemplate) : keyOrTemplate;

    const result: TemplateServiceRenderResult<T> = {
      name: template.name,
      fields: {} as any,
      options: template.options
    };

    for (const [key, field] of objectEntries(template.fields)) {
      const resolver = this.templateResolverProvider.get(field.resolver);
      const renderer = this.templateRendererProvider.get(field.renderer);

      const templateString = await resolver.resolve(field);
      const resultString = await renderer.render({ renderer: field.renderer, template: templateString, options: field.options }, templateContext);

      result.fields[key as keyof T['fields']] = resultString;
    }

    return result;
  }
}
