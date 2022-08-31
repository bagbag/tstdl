import { container, stubClass } from '#/container';
import type { Type } from '#/types';
import { StringTemplateRenderer } from './renderers/string.template-renderer';
import { StringTemplateResolver } from './resolvers/string.template-resolver';
import { TemplateProvider } from './template.provider';
import type { TemplateRenderer } from './template.renderer';
import type { TemplateResolver } from './template.resolver';
import { TEMPLATE_RENDERERS, TEMPLATE_RESOLVERS } from './tokens';

export type TemplateModuleConfig = {
  templateProvider: Type<TemplateProvider>,
  templateResolvers: Type<TemplateResolver>[],
  templateRenderers: Type<TemplateRenderer>[]
};

export const templateModuleConfig: TemplateModuleConfig = {
  templateProvider: stubClass(TemplateProvider),
  templateResolvers: [StringTemplateResolver],
  templateRenderers: [StringTemplateRenderer]
};

container.registerSingleton(TemplateProvider, { useTokenProvider: () => templateModuleConfig.templateProvider });

container.registerSingleton(TEMPLATE_RESOLVERS, {
  useFactory: (_, context) => {
    if (context.isAsync) {
      return (async () => {
        const resolves = templateModuleConfig.templateResolvers.map(async (type) => context.resolveAsync(type));
        return Promise.all(resolves);
      })();
    }

    const resolves = templateModuleConfig.templateResolvers.map((type) => context.resolve(type));
    return resolves.map((type) => context.resolve(type));
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

    const resolves = templateModuleConfig.templateRenderers.map((type) => context.resolve(type));
    return resolves.map((type) => context.resolve(type));
  }
});

/**
 * configure mail module
 */
export function configureTemplates({ templateProvider, templateResolvers, templateRenderers }: Partial<TemplateModuleConfig> = {}): void {
  templateModuleConfig.templateProvider = templateProvider ?? templateModuleConfig.templateProvider;
  templateModuleConfig.templateResolvers = [...new Set([...templateModuleConfig.templateResolvers, ...(templateResolvers ?? [])])];
  templateModuleConfig.templateRenderers = [...new Set([...templateModuleConfig.templateRenderers, ...(templateRenderers ?? [])])];
}
