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
  /**
   * The action that triggered the token payload retrieval.
   */
  action: GetTokenPayloadContextAction,
};

export type ResolveSubjectResult =
  | { success: true, subject: string }
  | { success: false, subject?: undefined };

/**
 * Ancillary service for authentication to hook into the authentication process.
 *
 * @param AdditionalTokenPayload Type of additional token payload
 * @param AuthenticationData Type of additional authentication data
 * @param AdditionalInitSecretResetData Type of additional secret reset data
 */
export abstract class AuthenticationAncillaryService<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData = void> {
  /**
   * Resolve a provided subject to the actual subject used for authentication.
   * Useful for example if you want to be able to login via mail but actual subject is the user id.
   * @param providedSubject The subject provided by the user, e.g. an email address.
   * @returns An object with success flag and the resolved subject if successful.
   * If the subject cannot be resolved, return an object with success set to false.
   */
  abstract resolveSubject(providedSubject: string): ResolveSubjectResult | Promise<ResolveSubjectResult>;

  /**
   * Get the additional token payload for a subject.
   * @param subject The subject for which to get the payload.
   * @param authenticationData Additional authentication data.
   * @param context Context for getting the token payload.
   * @returns The additional token payload.
   */
  abstract getTokenPayload(subject: string, authenticationData: AuthenticationData, context: GetTokenPayloadContext): AdditionalTokenPayload | Promise<AdditionalTokenPayload>;

  /**
   * Handle the initialization of a secret reset.
   * @param data Data for initializing the secret reset.
   */
  abstract handleInitSecretReset(data: InitSecretResetData & AdditionalInitSecretResetData): void | Promise<void>;

  /**
   * Check if token is allowed to impersonate subject.
   * @param token Token which tries to impersonate.
   * @param subject Subject to impersonate.
   * @param authenticationData Additional authentication data.
   * @returns Whether impersonation is allowed.
   */
  abstract canImpersonate(token: TokenPayload<AdditionalTokenPayload>, subject: string, authenticationData: AuthenticationData): boolean | Promise<boolean>;
}
