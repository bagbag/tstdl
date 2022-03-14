import { container, injectionToken } from '#/container';
import type { Type } from '#/types';
import type { ApiController } from './api-controller';

export type ApiControllers = Type<ApiController>[];

export const API_CONTROLLERS = injectionToken<ApiControllers>('API_CONTROLLERS');

export function registerApiControllers(...controllers: (Type<ApiController> | Type<ApiController>[])[]): void {
  container.register(API_CONTROLLERS, { useValue: controllers.flatMap((controller) => controller) });
}
