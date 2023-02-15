import { container } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { StringTemplateRenderer } from './renderers/string.template-renderer';
import { StringTemplateResolver } from './resolvers/string.template-resolver';
import { TemplateProvider } from './template.provider';
import type { TemplateRenderer } from './template.renderer';
import type { TemplateResolver } from './template.resolver';
import { TEMPLATE_RENDERERS, TEMPLATE_RESOLVERS } from './tokens';

export type TemplateModuleConfig = {
  templateProvider: Type<TemplateProvider> | undefined,
  templateResolvers: Type<TemplateResolver>[],
  templateRenderers: Type<TemplateRenderer>[]
};

export const templateModuleConfig: TemplateModuleConfig = {
  templateProvider: undefined,
  templateResolvers: [StringTemplateResolver],
  templateRenderers: [StringTemplateRenderer]
};

container.registerSingleton(TEMPLATE_RESOLVERS, {
  useFactory: (_, context) => {
    if (context.isAsync) {
      return (async () => {
        const resolves = templateModuleConfig.templateResolvers.map(async (type) => context.resolveAsync(type));
        return Promise.all(resolves);
      })();
    }

    return templateModuleConfig.templateResolvers.map((type) => context.resolve(type));
  }
});

container.registerSingleton(TEMPLATE_RENDERERS, {
  useFactory: (_, context) => {
    if (context.isAsync) {
      return (async () => {
        const resolves = templateModuleConfig.templateRenderers.map(async (type) => context.resolveAsync(type));
        return Promise.all(resolves);
      })();
    }

    return templateModuleConfig.templateRenderers.map((type) => context.resolve(type));
  }
});

/**
 * configure mail module
 */
export function configureTemplates(config: Partial<TemplateModuleConfig> = {}): void {
  if (isDefined(config.templateProvider)) {
    container.registerSingleton(TemplateProvider, { useToken: config.templateProvider });
  }

  templateModuleConfig.templateResolvers = [...new Set([...templateModuleConfig.templateResolvers, ...(config.templateResolvers ?? [])])];
  templateModuleConfig.templateRenderers = [...new Set([...templateModuleConfig.templateRenderers, ...(config.templateRenderers ?? [])])];
}
