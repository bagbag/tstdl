import type { ApiDefinition, ApiEndpointsDefinition } from '#/api/types';
import { defineApi } from '#/api/types';
import type { SchemaTestable } from '#/schema/schema';
import { assign } from '#/schema/schemas/assign';
import { literal } from '#/schema/schemas/literal';
import { number } from '#/schema/schemas/number';
import { emptyObjectSchema, explicitObject } from '#/schema/schemas/object';
import { string } from '#/schema/schemas/string';
import { unknown } from '#/schema/schemas/unknown';
import type { ObjectSchemaOrType } from '#/schema/types';
import { TokenPayloadBase } from './models';

type GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload = unknown, AuthenticationData = unknown> =
  typeof getAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData>;

type AuthenticationApiEndpointsDefinition<AdditionalTokenPayload = unknown, AuthenticationData = unknown> = ReturnType<GetAuthenticationApiEndpointsDefinition<AdditionalTokenPayload, AuthenticationData>>;

export type AuthenticationApiDefinition<AdditionalTokenPayload = unknown, AuthenticationData = unknown> =
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
      result: tokenResultSchema
    },
    refresh: {
      resource: 'refresh',
      method: 'POST',
      parameters: explicitObject({
        data: authenticationDataSchema
      }),
      result: tokenResultSchema
    },
    endSession: {
      resource: 'end-session',
      method: 'POST',
      result: literal('ok' as const)
    },
    timestamp: {
      result: number()
    }
  } satisfies ApiEndpointsDefinition;
}
