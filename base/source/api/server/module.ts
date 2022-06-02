import { container, injectionToken } from '#/container';
import type { Type } from '#/types';
import type { ApiControllerImplementation } from '../types';
import { ensureApiController } from './api-controller';

export type ApiControllers = Type<ApiControllerImplementation>[];

export const API_CONTROLLERS = injectionToken<ApiControllers>('API_CONTROLLERS');

export function registerApiControllers(...controllers: (Type | Type[])[]): void {
  const flatControllers = controllers.flatMap((controller) => controller);

  for (const controller of flatControllers) {
    ensureApiController(controller);
  }

  container.register(API_CONTROLLERS, { useValue: flatControllers });
}
