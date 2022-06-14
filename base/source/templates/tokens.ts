import { injectionToken } from '#/container';
import type { Type } from '#/types';
import type { TemplateRenderer } from './template.renderer';

export const TEMPLATE_RENDERERS = injectionToken<Type<TemplateRenderer>[]>('TEMPLATE_RENDERERS');
