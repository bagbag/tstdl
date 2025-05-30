import { Injector } from '#/injector/injector.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { ensureApiController } from './api-controller.js';
import { ApiRequestTokenProvider } from './api-request-token.provider.js';
import type { ApiGatewayOptions } from './gateway.js';
import { API_CONTROLLER, API_MODULE_OPTIONS } from './tokens.js';

export type ApiModuleOptions = {
  controllers: Type[],
  requestTokenProvider?: Type<ApiRequestTokenProvider>,
  gatewayOptions?: ApiGatewayOptions,
};

export const apiModuleOptions: ApiModuleOptions = {
  controllers: [],
};

export function configureApiServer(options: Partial<ApiModuleOptions>): void {
  if (isDefined(options.controllers)) {
    for (const controller of options.controllers) {
      ensureApiController(controller);
      Injector.register(API_CONTROLLER, { useToken: controller }, { multi: true });
    }
  }

  if (isDefined(options.requestTokenProvider)) {
    Injector.register(ApiRequestTokenProvider, { useToken: options.requestTokenProvider });
  }

  apiModuleOptions.gatewayOptions = options.gatewayOptions ?? apiModuleOptions.gatewayOptions;

  Injector.register(API_MODULE_OPTIONS, { useValue: apiModuleOptions });
}
