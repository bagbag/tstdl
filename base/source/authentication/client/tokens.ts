import type { ApiClientImplementation } from '#/api/index.js';
import { container, injectionToken } from '#/container/index.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { AuthenticationApiClient } from './api.client.js';

export const AUTHENTICATION_API_CLIENT = injectionToken<ApiClientImplementation<AuthenticationApiDefinition<any, any>>>('AUTHENTICATION_API_CLIENT');

export const INITIAL_AUTHENTICATION_DATA = injectionToken('INITIAL_AUTHENTICATION_DATA');

container.registerSingleton(AUTHENTICATION_API_CLIENT, { useToken: AuthenticationApiClient });
