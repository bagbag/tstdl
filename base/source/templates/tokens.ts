import { injectionToken } from '#/container';
import type { TemplateRenderer } from './template.renderer';
import type { TemplateResolver } from './template.resolver';

export const TEMPLATE_RENDERERS = injectionToken<TemplateRenderer[]>('TEMPLATE_RENDERERS');
export const TEMPLATE_RESOLVERS = injectionToken<TemplateResolver[]>('TEMPLATE_RESOLVERS');
