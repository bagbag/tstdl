import { container } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { ensureApiController } from './api-controller';
import type { ApiGatewayOptions } from './gateway';
import { API_MODULE_OPTIONS } from './tokens';

export type ApiModuleOptions = {
  controllers: Type[],
  gatewayOptions?: ApiGatewayOptions
};

export const apiModuleOptions: ApiModuleOptions = {
  controllers: []
};

export function configureApiServer(options: Partial<ApiModuleOptions>): void {
  if (isDefined(options.controllers)) {
    for (const controller of options.controllers) {
      ensureApiController(controller);
    }

    apiModuleOptions.controllers = options.controllers;
  }

  apiModuleOptions.gatewayOptions = options.gatewayOptions ?? apiModuleOptions.gatewayOptions;

  container.register(API_MODULE_OPTIONS, { useValue: apiModuleOptions });
}
