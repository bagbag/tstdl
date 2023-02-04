import type { ApiEndpointsDefinition } from '#/api/types';
import { Property } from '#/schema/decorators/property';
import { literal } from '#/schema/schemas/literal';
import type { ObjectSchema, SchemaOutput } from '#/schema/types/types';
import type { AbstractConstructor } from '#/types';
import { TokenPayloadBase } from './models';

export class GetTokenParameters {
  @Property()
  subject: string;

  @Property()
  secret: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getAuthenticationApiEndpointsDefinition<
  AuthenticationDataSchema extends ObjectSchema<GetTokenParameters> | AbstractConstructor<GetTokenParameters>,
  TokenPayloadSchema extends ObjectSchema<TokenPayloadBase> | AbstractConstructor<TokenPayloadBase>
>(
  options: {
    tokenPayloadSchema?: TokenPayloadSchema,
    authenticationDataSchema?: AuthenticationDataSchema
  } = {}
) {
  const tokenParametersSchema = (options.authenticationDataSchema ?? GetTokenParameters) as ObjectSchema<SchemaOutput<AuthenticationDataSchema>> | AbstractConstructor<SchemaOutput<AuthenticationDataSchema>>
  const tokenResultSchema = (options.tokenPayloadSchema ?? TokenPayloadBase) as ObjectSchema<SchemaOutput<TokenPayloadSchema>> | AbstractConstructor<SchemaOutput<TokenPayloadSchema>>;

  return {
    token: {
      resource: 'token',
      method: 'POST',
      parameters: tokenParametersSchema,
      result: tokenResultSchema
    },
    refresh: {
      resource: 'refresh',
      method: 'POST',
      result: tokenResultSchema
    },
    endSession: {
      resource: 'end-session',
      method: 'POST',
      result: literal('ok' as const)
    }
  } satisfies ApiEndpointsDefinition;
}
