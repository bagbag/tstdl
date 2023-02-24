import { container } from '#/container/index.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { StringTemplateRenderer } from './renderers/string.template-renderer.js';
import { StringTemplateResolver } from './resolvers/string.template-resolver.js';
import { TemplateProvider } from './template.provider.js';
import type { TemplateRenderer } from './template.renderer.js';
import type { TemplateResolver } from './template.resolver.js';
import { TEMPLATE_RENDERERS, TEMPLATE_RESOLVERS } from './tokens.js';

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
