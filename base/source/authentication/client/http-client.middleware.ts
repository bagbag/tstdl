import { firstValueFrom } from 'rxjs';

import type { ApiClientHttpRequestContext } from '#/api/client/index.js';
import type { HttpClientMiddleware, HttpClientMiddlewareContext, HttpClientMiddlewareNext } from '#/http/client/middleware.js';
import { cacheAsyncValueOrProvider, type ValueOrAsyncProvider } from '#/utils/value-or-provider.js';
import { dontWaitForValidToken } from '../authentication.api.js';
import type { AuthenticationClientService } from './authentication.service.js';

export function waitForAuthenticationCredentialsMiddleware(authenticationServiceOrProvider: ValueOrAsyncProvider<AuthenticationClientService>): HttpClientMiddleware {
  const getAuthenticationService = cacheAsyncValueOrProvider(authenticationServiceOrProvider);

  // eslint-disable-next-line @typescript-eslint/no-shadow
  async function waitForAuthenticationCredentialsMiddleware({ request }: HttpClientMiddlewareContext, next: HttpClientMiddlewareNext): Promise<void> {
    const endpoint = (request.context as Partial<ApiClientHttpRequestContext> | undefined)?.endpoint;

    if ((endpoint?.credentials == true) && (endpoint.data?.[dontWaitForValidToken] != true)) {
      const authenticationService = await getAuthenticationService();

      while (!authenticationService.hasValidToken) {
        await firstValueFrom(authenticationService.validToken$);
      }
    }

    return next();
  }

  return waitForAuthenticationCredentialsMiddleware;
}
