import { Injector } from '#/injector/injector.js';
import type { Type } from '#/types/index.js';
import { isDefined } from '#/utils/type-guards.js';
import { StringTemplateRenderer } from './renderers/string.template-renderer.js';
import { StringTemplateResolver } from './resolvers/string.template-resolver.js';
import { TemplateProvider } from './template.provider.js';
import { TemplateRenderer } from './template.renderer.js';
import { TemplateResolver } from './template.resolver.js';
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

Injector.registerSingleton(TEMPLATE_RESOLVERS, { useToken: TemplateResolver, resolveAll: true });
Injector.registerSingleton(TEMPLATE_RENDERERS, { useToken: TemplateRenderer, resolveAll: true });

/**
 * configure mail module
 */
export function configureTemplates(config: Partial<TemplateModuleConfig> = {}): void {
  if (isDefined(config.templateProvider)) {
    Injector.registerSingleton(TemplateProvider, { useToken: config.templateProvider });
  }

  if (isDefined(config.templateResolvers)) {
    Injector.register(TemplateResolver, config.templateResolvers.map((resolver) => ({ useToken: resolver })));
  }

  if (isDefined(config.templateRenderers)) {
    Injector.register(TemplateRenderer, config.templateRenderers.map((renderer) => ({ useToken: renderer })));
  }
}
