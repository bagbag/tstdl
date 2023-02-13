import type { ApiClient } from '#/api/client';
import { compileClient } from '#/api/client';
import { singleton } from '#/container';
import { HttpClient } from '#/http/client/http-client';
import type { SchemaTestable } from '#/schema/schema';
import { emptyObjectSchema } from '#/schema/schemas/object';
import { unknown } from '#/schema/schemas/unknown';
import type { ObjectSchemaOrType } from '#/schema/types/types';
import type { AuthenticationApiDefinition } from '../authentication.api';
import { getAuthenticationApiDefinition } from '../authentication.api';

export function getAuthenticationApiClient<AdditionalTokenPayload, AuthenticationData>(
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>
): ApiClient<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>> {
  const definition = getAuthenticationApiDefinition(additionalTokenPayloadSchema, authenticationDataSchema);

  @singleton()
  class AuthenticationApiClient extends compileClient(definition) {
    constructor(httpClient: HttpClient) {
      super(httpClient);
    }
  }

  return AuthenticationApiClient;
}

export const AuthenticationApiClient = getAuthenticationApiClient(emptyObjectSchema, unknown());
