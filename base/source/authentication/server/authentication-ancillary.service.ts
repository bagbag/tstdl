import type { Record } from '#/types.js';
import type { TokenPayload } from '../index.js';
import type { InitSecretResetData } from '../models/init-secret-reset-data.model.js';

export enum GetTokenPayloadContextAction {
  GetToken = 0,
  Refresh = 1
}

export type GetTokenPayloadContext = {
  action: GetTokenPayloadContextAction
};

export abstract class AuthenticationAncillaryService<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData extends Record = Record<never>> {
  /**
   * Resolve a provided subject to the actual subject used for authentication.
   * Useful for example if you want to be able to login via mail but actual subject is the user id.
   */
  abstract resolveSubject(providedSubject: string): string | Promise<string>;

  abstract getTokenPayload(subject: string, authenticationData: AuthenticationData, context: GetTokenPayloadContext): AdditionalTokenPayload | Promise<AdditionalTokenPayload>;

  abstract handleInitSecretReset(data: InitSecretResetData & AdditionalInitSecretResetData): void | Promise<void>;

  /**
   * Check if token is allowed to impersonate subject
   * @param token Token which tries to impersonate
   * @param subject Subject to impersonate
   */
  abstract canImpersonate(token: TokenPayload<AdditionalTokenPayload>, subject: string, authenticationData: AuthenticationData): boolean | Promise<boolean>;
}
