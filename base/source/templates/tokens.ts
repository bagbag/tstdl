import { injectionToken } from '#/container/index.js';
import type { TemplateRenderer } from './template.renderer.js';
import type { TemplateResolver } from './template.resolver.js';

export const TEMPLATE_RENDERERS = injectionToken<TemplateRenderer[]>('TEMPLATE_RENDERERS');
export const TEMPLATE_RESOLVERS = injectionToken<TemplateResolver[]>('TEMPLATE_RESOLVERS');
