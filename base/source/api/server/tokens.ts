import { Injector } from '#/injector/injector.js';
import { injectionToken } from '#/injector/token.js';
import type { ApiController } from '../types.js';
import type { ApiModuleOptions } from './module.js';

export const API_MODULE_OPTIONS = injectionToken<ApiModuleOptions>('ApiModuleOptions');

export const API_CONTROLLER = injectionToken<ApiController>('ApiController');

export const API_CONTROLLERS = injectionToken<ApiController[]>('ApiControllers');

Injector.register(API_CONTROLLERS, { useToken: API_CONTROLLER, resolveAll: true });
