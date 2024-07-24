import { ApiClient, compileClient } from '#/api/client/index.js';
import { ReplaceClass, Singleton } from '#/injector/index.js';
import { emptyObjectSchema, ObjectSchemaOrType, SchemaTestable, unknown } from '#/schema/index.js';
import type { Record } from '#/types.js';
import { AuthenticationApiDefinition, getAuthenticationApiDefinition } from '../authentication.api.js';

export function getAuthenticationApiClient<AdditionalTokenPayload extends Record, AuthenticationData, AdditionalInitSecretResetData extends Record>(
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>,
  additionalInitSecretResetData: ObjectSchemaOrType<AdditionalInitSecretResetData>
): ApiClient<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>> {
  const definition = getAuthenticationApiDefinition(additionalTokenPayloadSchema, authenticationDataSchema, additionalInitSecretResetData);

  @Singleton()
  class AuthenticationApiClient extends compileClient(definition) { }

  return AuthenticationApiClient;
}

const defaultAuthenticationApiClient = getAuthenticationApiClient(emptyObjectSchema, unknown(), emptyObjectSchema);

@ReplaceClass(defaultAuthenticationApiClient)
export class AuthenticationApiClient extends defaultAuthenticationApiClient { }
