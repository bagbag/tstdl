/**
 * Resolve a provided subject to the actual subject used for authentication.
 * Useful for example if you want to be able to login via mail but actual subject is the user id.
 */
export abstract class AuthenticationSubjectResolver {
  abstract resolveSubject(providedSubject: string): string | Promise<string>;
}
