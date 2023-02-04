import { Class } from '#/reflection';

@Class()
export abstract class AuthenticationTokenPayloadProvider<TokenPayload, AdditionalAuthenticationData> {
  abstract getTokenPayload(subject: string, additionalAuthenticationData: AdditionalAuthenticationData): Promise<TokenPayload>;
}
