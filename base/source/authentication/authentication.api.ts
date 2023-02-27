import type { ApiDefinition, ApiEndpointsDefinition } from '#/api/types.js';
import { defineApi } from '#/api/types.js';
import type { SchemaTestable } from '#/schema/schema.js';
import { assign } from '#/schema/schemas/assign.js';
import { literal } from '#/schema/schemas/literal.js';
import { number } from '#/schema/schemas/number.js';
import { emptyObjectSchema, explicitObject } from '#/schema/schemas/object.js';
import { string } from '#/schema/schemas/string.js';
import { unknown } from '#/schema/schemas/unknown.js';
import type { ObjectSchemaOrType } from '#/schema/types/types.js';
import type { Record } from '#/types.js';
import { TokenPayloadBase } from './models/token-payload-base.model.js';

type GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload = Record<never>, AuthenticationData = void> =
  typeof getAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData>;

type AuthenticationApiEndpointsDefinition<AdditionalTokenPayload = Record<never>, AuthenticationData = void> = ReturnType<GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData>>;

export type AuthenticationApiDefinition<AdditionalTokenPayload = Record<never>, AuthenticationData = void> =
  ApiDefinition<string, AuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData>>;

export const authenticationApiDefinition = getAuthenticationApiDefinition(emptyObjectSchema, unknown());

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getAuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalEndpoints>(
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>,
  resource?: string,
  additionalEndpoints?: AdditionalEndpoints
) {
  return defineApi({
    resource: resource ?? 'auth',
    endpoints: {
      ...getAuthenticationApiEndpointsDefinition(additionalTokenPayloadSchema, authenticationDataSchema),
      ...additionalEndpoints
    }
  });
}

export const dontWaitForValidToken: unique symbol = Symbol('dontWaitForValidToken');

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData>(
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>
) {
  const tokenResultSchema = assign(TokenPayloadBase, additionalTokenPayloadSchema);

  return {
    token: {
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
    endSession: {
      resource: 'end-session',
      method: 'POST',
      result: literal('ok' as const),
      credentials: true,
      data: {
        [dontWaitForValidToken]: true
      }
    },
    timestamp: {
      resource: 'timestamp',
      result: number()
    }
  } satisfies ApiEndpointsDefinition;
}
