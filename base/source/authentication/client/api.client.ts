import { type ApiClient, compileClient } from '#/api/client/index.js';
import { ReplaceClass, Singleton } from '#/injector/index.js';
import { emptyObjectSchema, type ObjectSchemaOrType, type SchemaTestable, unknown } from '#/schema/index.js';
import type { Record } from '#/types/index.js';
import { type AuthenticationApiDefinition, getAuthenticationApiDefinition } from '../authentication.api.js';

/**
 * Get an authentication API client
 * @param additionalTokenPayloadSchema Schema for additional token payload
 * @param authenticationDataSchema Schema for additional authentication data
 * @param additionalInitSecretResetData Schema for additional secret reset data
 * @returns Authentication API client
 * @template AdditionalTokenPayload Type of additional token payload
 * @template AuthenticationData Type of additional authentication data
 * @template AdditionalInitSecretResetData Type of additional secret reset data
 */
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

/**
 * Default authentication API client
 */
@ReplaceClass(defaultAuthenticationApiClient)
export class AuthenticationApiClient extends defaultAuthenticationApiClient { }
