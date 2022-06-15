import { container, stubClass } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { TemplateProvider } from './template.provider';
import type { TemplateRenderer } from './template.renderer';
import { TEMPLATE_RENDERERS } from './tokens';

export type TemplateModuleConfig = {
  templateProvider: Type<TemplateProvider>,
  templateRenderers: Type<TemplateRenderer>[]
};

export const templateModuleConfig: TemplateModuleConfig = {
  templateProvider: stubClass(TemplateProvider),
  templateRenderers: []
};

/**
 * configure mail module
 */
export function configureTemplates({ templateProvider, templateRenderers }: Partial<TemplateModuleConfig> = {}): void {
  templateModuleConfig.templateProvider = templateProvider ?? templateModuleConfig.templateProvider;
  templateModuleConfig.templateRenderers = [...new Set([...templateModuleConfig.templateRenderers, ...(templateRenderers ?? [])])];

  if (isDefined(templateProvider)) {
    container.registerSingleton(TemplateProvider, { useToken: templateProvider });
  }

  container.registerSingleton(TEMPLATE_RENDERERS, { useValue: templateModuleConfig.templateRenderers });
}
