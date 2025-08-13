import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import type { Record } from '#/types/index.js';
import type { TokenPayload } from '../index.js';
import type { InitSecretResetData } from '../models/init-secret-reset-data.model.js';

export const GetTokenPayloadContextAction = defineEnum('GetTokenPayloadContextAction', {
  GetToken: 'get-token',
  Refresh: 'refresh',
});

export type GetTokenPayloadContextAction = EnumType<typeof GetTokenPayloadContextAction>;

export type GetTokenPayloadContext = {
  action: GetTokenPayloadContextAction,
};

export type ResolveSubjectResult =
  | { success: true, subject: string }
  | { success: false, subject?: undefined };

export abstract class AuthenticationAncillaryService<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData = void> {
  /**
   * Resolve a provided subject to the actual subject used for authentication.
   * Useful for example if you want to be able to login via mail but actual subject is the user id.
   * @param providedSubject The subject provided by the user, e.g. an email address.
   * @returns An object with success flag and the resolved subject if successful.
   * If the subject cannot be resolved, return an object with success set to false.
   */
  abstract resolveSubject(providedSubject: string): ResolveSubjectResult | Promise<ResolveSubjectResult>;

  abstract getTokenPayload(subject: string, authenticationData: AuthenticationData, context: GetTokenPayloadContext): AdditionalTokenPayload | Promise<AdditionalTokenPayload>;

  abstract handleInitSecretReset(data: InitSecretResetData & AdditionalInitSecretResetData): void | Promise<void>;

  /**
   * Check if token is allowed to impersonate subject
   * @param token Token which tries to impersonate
   * @param subject Subject to impersonate
   */
  abstract canImpersonate(token: TokenPayload<AdditionalTokenPayload>, subject: string, authenticationData: AuthenticationData): boolean | Promise<boolean>;
}
