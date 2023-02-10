import type { ApiClientImplementation } from '#/api';
import { container } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import type { AuthenticationApiDefinition } from '../authentication.api';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens';

export type AuthenticationModuleConfig = {
  authenticationApiClient: Type<ApiClientImplementation<AuthenticationApiDefinition<any, any>>>,
  initialAuthenticationData: unknown
};

export function configureAuthenticationClient(config: Partial<AuthenticationModuleConfig> = {}): void {
  if (isDefined(config.authenticationApiClient)) {
    container.registerSingleton(AUTHENTICATION_API_CLIENT, { useToken: config.authenticationApiClient });
  }

  if (isDefined(config.initialAuthenticationData)) {
    container.register(INITIAL_AUTHENTICATION_DATA, { useValue: config.initialAuthenticationData });
  }
}
