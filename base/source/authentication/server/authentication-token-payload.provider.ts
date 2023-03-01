import type { Record } from '#/types.js';

export enum GetTokenPayloadContextAction {
  GetToken = 0,
  Refresh = 1
}

export type GetTokenPayloadContext = {
  action: GetTokenPayloadContextAction
};

export abstract class AuthenticationTokenPayloadProvider<AdditionalTokenPayload = Record<never>, AuthenticationData = void> {
  abstract getTokenPayload(subject: string, authenticationData: AuthenticationData, context: GetTokenPayloadContext): AdditionalTokenPayload | Promise<AdditionalTokenPayload>;
}
