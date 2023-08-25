import { injectionToken } from '#/injector/token.js';
import type { TemplateRenderer } from './template.renderer.js';
import type { TemplateResolver } from './template.resolver.js';

export const TEMPLATE_RENDERERS = injectionToken<TemplateRenderer[]>('template renderers');
export const TEMPLATE_RESOLVERS = injectionToken<TemplateResolver[]>('template resolvers');
