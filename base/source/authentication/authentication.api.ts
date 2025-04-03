import { type ApiDefinition, type ApiEndpointsDefinition, defineApi } from '#/api/types.js';
import { assign, emptyObjectSchema, explicitObject, literal, never, number, object, type ObjectSchema, type ObjectSchemaOrType, optional, string } from '#/schema/index.js';
import type { SchemaTestable } from '#/schema/schema.js';
import type { Record } from '#/types.js';
import type { TokenPayload } from './index.js';
import { SecretCheckResult } from './models/secret-check-result.model.js';
import { TokenPayloadBase } from './models/token-payload-base.model.js';

export const dontWaitForValidToken: unique symbol = Symbol('dontWaitForValidToken');

type GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData extends Record = Record<never>> =
  typeof getAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>;

type AuthenticationApiEndpointsDefinition<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData extends Record = Record<never>> = ReturnType<GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>>;

export type AuthenticationApiDefinition<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData extends Record = Record<never>> =
  ApiDefinition<string, AuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>>;

export const authenticationApiDefinition = getAuthenticationApiDefinition(emptyObjectSchema, optional(never()), optional(never()));

export function getAuthenticationApiDefinition<AdditionalTokenPayload extends Record, AuthenticationData, AdditionalInitSecretResetData, AdditionalEndpoints extends ApiEndpointsDefinition>(
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>,
  initSecretResetDataSchema: SchemaTestable<AdditionalInitSecretResetData>,
  resource?: string,
  additionalEndpoints?: AdditionalEndpoints
) {
  return defineApi({
    resource: resource ?? 'auth',
    endpoints: {
      ...getAuthenticationApiEndpointsDefinition(additionalTokenPayloadSchema, authenticationDataSchema, initSecretResetDataSchema),
      ...additionalEndpoints
    }
  });
}

export function getAuthenticationApiEndpointsDefinition<AdditionalTokenPayload extends Record, AuthenticationData, AdditionalInitSecretResetData>(
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>,
  additionalInitSecretResetDataSchema: SchemaTestable<AdditionalInitSecretResetData>
) {
  const tokenResultSchema = assign(TokenPayloadBase, additionalTokenPayloadSchema) as unknown as ObjectSchema<TokenPayload<AdditionalTokenPayload>>;

  return {
    getToken: {
      resource: 'token',
      method: 'POST',
      parameters: explicitObject({
        subject: string(),
        secret: string(),
        data: authenticationDataSchema
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true
      }
    },
    refresh: {
      resource: 'refresh',
      method: 'POST',
      parameters: explicitObject({
        data: authenticationDataSchema
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true
      }
    },
    impersonate: {
      resource: 'impersonate',
      method: 'POST',
      parameters: explicitObject({
        subject: string(),
        data: authenticationDataSchema
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true
      }
    },
    unimpersonate: {
      resource: 'unimpersonate',
      method: 'POST',
      parameters: explicitObject({
        data: authenticationDataSchema
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true
      }
    },
    endSession: {
      resource: 'end-session',
      method: 'POST',
      result: literal('ok' as const),
      credentials: true,
      data: {
        [dontWaitForValidToken]: true
      }
    },
    initSecretReset: {
      resource: 'secret/init-reset',
      method: 'POST',
      parameters: explicitObject({
        subject: string(),
        data: additionalInitSecretResetDataSchema
      }),
      result: literal('ok' as const)
    },
    resetSecret: {
      resource: 'secret/reset',
      method: 'POST',
      parameters: object({
        token: string(),
        newSecret: string()
      }),
      result: literal('ok' as const)
    },
    checkSecret: {
      resource: 'secret/check',
      method: 'POST',
      parameters: object({
        secret: string()
      }),
      result: SecretCheckResult
    },
    timestamp: {
      resource: 'timestamp',
      result: number()
    }
  } satisfies ApiEndpointsDefinition;
}
