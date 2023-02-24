import { container } from '#/container/index.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { ensureApiController } from './api-controller.js';
import { ApiRequestTokenProvider } from './api-request-token.provider.js';
import type { ApiGatewayOptions } from './gateway.js';
import { API_MODULE_OPTIONS } from './tokens.js';

export type ApiModuleOptions = {
  controllers: Type[],
  requestTokenProvider?: Type<ApiRequestTokenProvider>,
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

  if (isDefined(options.requestTokenProvider)) {
    container.registerSingleton(ApiRequestTokenProvider, { useToken: options.requestTokenProvider });
  }

  apiModuleOptions.gatewayOptions = options.gatewayOptions ?? apiModuleOptions.gatewayOptions;

  container.register(API_MODULE_OPTIONS, { useValue: apiModuleOptions });
}
