import { firstValueFrom } from 'rxjs';

import type { ApiClientHttpRequestContext } from '#/api/client/index.js';
import type { HttpClientRequest } from '#/http/client/http-client-request.js';
import type { HttpClientResponse } from '#/http/client/http-client-response.js';
import type { HttpClientMiddleware, HttpClientMiddlewareNext } from '#/http/client/middleware.js';
import { dontWaitForValidToken } from '../authentication.api.js';
import type { AuthenticationService } from './authentication.service.js';

export function waitForAuthenticationCredentialsMiddleware(authenticationService: AuthenticationService): HttpClientMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  async function waitForAuthenticationCredentialsMiddleware(request: HttpClientRequest, next: HttpClientMiddlewareNext, context: unknown): Promise<HttpClientResponse> {
    const endpoint = (context as Partial<ApiClientHttpRequestContext> | undefined)?.endpoint;

    if ((endpoint?.credentials == true) && (endpoint.data?.[dontWaitForValidToken] != true)) {
      while (!authenticationService.hasValidToken) {
        await firstValueFrom(authenticationService.validToken$);
      }
    }

    return next(request);
  }

  return waitForAuthenticationCredentialsMiddleware;
}
