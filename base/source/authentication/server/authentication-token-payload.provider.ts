import { Class } from '#/reflection';
import type { Record } from '#/types';

@Class()
export abstract class AuthenticationTokenPayloadProvider<AdditionalTokenPayload = Record<never>, AuthenticationData = void> {
  abstract getTokenPayload(subject: string, authenticationData: AuthenticationData): AdditionalTokenPayload | Promise<AdditionalTokenPayload>;
}
