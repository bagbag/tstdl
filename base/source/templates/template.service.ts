import { Singleton } from '#/injector/decorators.js';
import { inject } from '#/injector/inject.js';
import type { Record } from '#/types/index.js';
import { objectEntries } from '#/utils/object/object.js';
import { _throw } from '#/utils/throw.js';
import { isString } from '#/utils/type-guards.js';
import { TemplateRendererProvider } from './template-renderer.provider.js';
import { TemplateResolverProvider } from './template-resolver.provider.js';
import type { Template, TemplateContext } from './template.model.js';
import { TemplateProvider } from './template.provider.js';

export type TemplateServiceRenderResult<T extends Template = Template> = {
  name: string,
  fields: Record<keyof T['fields'], string>,
  options: T['options']
};

@Singleton()
export class TemplateService {
  private readonly templateProvider = inject(TemplateProvider, undefined, { optional: true }) ?? { get: () => _throw(new Error('No template provider provided. Cannot render template-keys.')) };
  private readonly templateRendererProvider = inject(TemplateRendererProvider);
  private readonly templateResolverProvider = inject(TemplateResolverProvider);

  async get<T extends Template = Template>(key: string): Promise<T> {
    const template = await this.templateProvider.get(key);
    return template as T;
  }

  async render<T extends Template = Template>(keyOrTemplate: string | T, templateContext?: TemplateContext<T>): Promise<TemplateServiceRenderResult<T>> {
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
