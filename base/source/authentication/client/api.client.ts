import { type ApiClient, compileClient } from '#/api/client/index.js';
import { ReplaceClass, Singleton } from '#/injector/index.js';
import { emptyObjectSchema, type ObjectSchemaOrType, type SchemaTestable, unknown } from '#/schema/index.js';
import type { Record } from '#/types.js';
import { type AuthenticationApiDefinition, getAuthenticationApiDefinition } from '../authentication.api.js';

export function getAuthenticationApiClient<AdditionalTokenPayload extends Record, AuthenticationData, AdditionalInitSecretResetData>(
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>,
  additionalInitSecretResetData: SchemaTestable<AdditionalInitSecretResetData>
): ApiClient<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>> {
  const definition = getAuthenticationApiDefinition(additionalTokenPayloadSchema, authenticationDataSchema, additionalInitSecretResetData);

  @Singleton()
  class AuthenticationApiClient extends compileClient(definition) { }

  return AuthenticationApiClient;
}

const defaultAuthenticationApiClient = getAuthenticationApiClient(emptyObjectSchema, unknown(), emptyObjectSchema);

@ReplaceClass(defaultAuthenticationApiClient)
export class AuthenticationApiClient extends defaultAuthenticationApiClient { }
