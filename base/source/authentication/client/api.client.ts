import type { ApiClient } from '#/api/client/index.js';
import { compileClient } from '#/api/client/index.js';
import { ReplaceClass, Singleton } from '#/injector/index.js';
import type { SchemaTestable } from '#/schema/schema.js';
import { emptyObjectSchema } from '#/schema/schemas/object.js';
import { unknown } from '#/schema/schemas/unknown.js';
import type { ObjectSchemaOrType } from '#/schema/types/types.js';
import type { Record } from '#/types.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { getAuthenticationApiDefinition } from '../authentication.api.js';

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
