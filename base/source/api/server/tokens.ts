import { injectionToken } from '#/container/index.js';
import type { ApiModuleOptions } from './module.js';

export const API_MODULE_OPTIONS = injectionToken<ApiModuleOptions>('ApiModuleOptions');
