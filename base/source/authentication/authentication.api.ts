import { type ApiDefinition, type ApiEndpointsDefinition, defineApi } from '#/api/types.js';
import { assign, emptyObjectSchema, explicitObject, literal, never, number, object, type ObjectSchema, type ObjectSchemaOrType, optional, string } from '#/schema/index.js';
import type { SchemaTestable } from '#/schema/schema.js';
import type { Record } from '#/types/index.js';
import type { TokenPayload } from './index.js';
import { SecretCheckResult } from './models/secret-check-result.model.js';
import { TokenPayloadBase } from './models/token-payload-base.model.js';

/**
 * Can be provided in {@link ApiEndpointDefinition} data property to signal that the request does not need a valid token.
 * Useful for login, refresh, etc. endpoints.
 */
export const dontWaitForValidToken: unique symbol = Symbol('dontWaitForValidToken');

type GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData = void> =
  typeof getAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>;

type AuthenticationApiEndpointsDefinition<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData = void> = ReturnType<GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>>;

/**
 * Authentication REST API definition
 *
 * @template AdditionalTokenPayload Type of additional token payload
 * @template AuthenticationData Type of additional authentication data
 * @template AdditionalInitSecretResetData Type of additional secret reset data
 */
export type AuthenticationApiDefinition<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData = void> =
  ApiDefinition<string, AuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>>;

/** Default authentication API definition */
export const authenticationApiDefinition = getAuthenticationApiDefinition(emptyObjectSchema, optional(never()), optional(never()));

/**
 * Get authentication REST API definition
 * @param additionalTokenPayloadSchema Schema for additional token payload
 * @param authenticationDataSchema Schema for additional authentication data
 * @param initSecretResetDataSchema Schema for additional secret reset data
 * @param resource Resource name (default: 'auth')
 * @param additionalEndpoints Additional endpoints to add to the API definition
 * @returns Authentication REST API definition
 * @template AdditionalTokenPayload Type of additional token payload
 * @template AuthenticationData Type of additional authentication data
 * @template AdditionalInitSecretResetData Type of additional secret reset data
 * @template AdditionalEndpoints Type of additional endpoints
 */
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
      ...additionalEndpoints,
    },
  });
}

/**
 * Get authentication REST API endpoints definition
 * @param additionalTokenPayloadSchema Schema for additional token payload
 * @param authenticationDataSchema Schema for additional authentication data
 * @param additionalInitSecretResetDataSchema Schema for additional secret reset data
 * @returns Authentication REST API endpoints definition
 * @template AdditionalTokenPayload Type of additional token payload
 * @template AuthenticationData Type of additional authentication data
 * @template AdditionalInitSecretResetData Type of additional secret reset data
 */
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
        data: authenticationDataSchema,
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true,
      },
    },
    refresh: {
      resource: 'refresh',
      method: 'POST',
      parameters: explicitObject({
        data: authenticationDataSchema,
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true,
      },
    },
    impersonate: {
      resource: 'impersonate',
      method: 'POST',
      parameters: explicitObject({
        subject: string(),
        data: authenticationDataSchema,
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true,
      },
    },
    unimpersonate: {
      resource: 'unimpersonate',
      method: 'POST',
      parameters: explicitObject({
        data: authenticationDataSchema,
      }),
      result: tokenResultSchema,
      credentials: true,
      data: {
        [dontWaitForValidToken]: true,
      },
    },
    endSession: {
      resource: 'end-session',
      method: 'POST',
      result: literal('ok' as const),
      credentials: true,
      data: {
        [dontWaitForValidToken]: true,
      },
    },
    initSecretReset: {
      resource: 'secret/init-reset',
      method: 'POST',
      parameters: explicitObject({
        subject: string(),
        data: additionalInitSecretResetDataSchema,
      }),
      result: literal('ok' as const),
    },
    resetSecret: {
      resource: 'secret/reset',
      method: 'POST',
      parameters: object({
        token: string(),
        newSecret: string(),
      }),
      result: literal('ok' as const),
    },
    checkSecret: {
      resource: 'secret/check',
      method: 'POST',
      parameters: object({
        secret: string(),
      }),
      result: SecretCheckResult,
    },
    timestamp: {
      resource: 'timestamp',
      result: number(),
    },
  } satisfies ApiEndpointsDefinition;
}
