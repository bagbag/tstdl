import { compileClient } from '#/api/client';
import { singleton } from '#/container';
import { HttpClient } from '#/http/client/http-client';
import { authenticationApiDefinition } from '../authentication.api';

@singleton()
export class AuthenticationApiClient extends compileClient(authenticationApiDefinition) {
  constructor(httpClient: HttpClient) {
    super(httpClient);
  }
}
