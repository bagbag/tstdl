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
import type { Record } from '#/types';
import { TokenPayloadBase } from './models';

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
      credentials: true
    },
    refresh: {
      resource: 'refresh',
      method: 'POST',
      parameters: explicitObject({
        data: authenticationDataSchema
      }),
      result: tokenResultSchema,
      credentials: true
    },
    endSession: {
      resource: 'end-session',
      method: 'POST',
      result: literal('ok' as const),
      credentials: true
    },
    timestamp: {
      resource: 'timestamp',
      result: number()
    }
  } satisfies ApiEndpointsDefinition;
}
