import type { ApiClientImplementation } from '#/api';
import { container, injectionToken } from '#/container';
import type { AuthenticationApiDefinition } from '../authentication.api';
import { AuthenticationApiClient } from './api.client';

export const AUTHENTICATION_API_CLIENT = injectionToken<ApiClientImplementation<AuthenticationApiDefinition<any, any>>>('AUTHENTICATION_API_CLIENT');

export const INITIAL_AUTHENTICATION_DATA = injectionToken('INITIAL_AUTHENTICATION_DATA');

container.registerSingleton(AUTHENTICATION_API_CLIENT, { useToken: AuthenticationApiClient });
