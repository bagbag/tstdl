import { Class } from '#/reflection/index.js';
import type { Record } from '#/types.js';

@Class()
export abstract class AuthenticationTokenPayloadProvider<AdditionalTokenPayload = Record<never>, AuthenticationData = void> {
  abstract getTokenPayload(subject: string, authenticationData: AuthenticationData): AdditionalTokenPayload | Promise<AdditionalTokenPayload>;
}
