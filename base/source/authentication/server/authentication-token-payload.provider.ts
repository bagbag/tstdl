import { Class } from '#/reflection';

@Class()
export abstract class AuthenticationTokenPayloadProvider<TokenPayload = any, AuthenticationData = any> {
  abstract getTokenPayload(subject: string, authenticationData: AuthenticationData): Promise<TokenPayload>;
}
