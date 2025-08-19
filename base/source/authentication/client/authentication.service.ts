import { Subject, filter, firstValueFrom, race, timer } from 'rxjs';

import type { ApiClient } from '#/api/client/index.js';
import { CancellationToken } from '#/cancellation/token.js';
import type { AsyncDisposable } from '#/disposable/index.js';
import { disposeAsync } from '#/disposable/index.js';
import { BadRequestError } from '#/errors/bad-request.error.js';
import { ForbiddenError } from '#/errors/forbidden.error.js';
import { InvalidTokenError } from '#/errors/invalid-token.error.js';
import { NotFoundError } from '#/errors/not-found.error.js';
import { NotSupportedError } from '#/errors/not-supported.error.js';
import { UnauthorizedError } from '#/errors/unauthorized.error.js';
import type { AfterResolve } from '#/injector/index.js';
import { Inject, Optional, Singleton, afterResolve, inject } from '#/injector/index.js';
import { Lock } from '#/lock/index.js';
import { Logger } from '#/logger/index.js';
import { MessageBus } from '#/message-bus/index.js';
import { computed, signal, toObservable } from '#/signals/api.js';
import type { Record } from '#/types/index.js';
import { currentTimestampSeconds } from '#/utils/date-time.js';
import { formatError } from '#/utils/format-error.js';
import { timeout } from '#/utils/timing.js';
import { assertDefinedPass, isDefined, isNullOrUndefined, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import type { SecretCheckResult, TokenPayload } from '../models/index.js';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens.js';

const tokenStorageKey = 'AuthenticationService:token';
const authenticationDataStorageKey = 'AuthenticationService:authentication-data';
const impersonatorAuthenticationDataStorageKey = 'AuthenticationService:impersonator-authentication-data';
const tokenUpdateBusName = 'AuthenticationService:tokenUpdate';
const loggedOutBusName = 'AuthenticationService:loggedOut';
const refreshLockResource = 'AuthenticationService:refresh';

const localStorage = globalThis.localStorage as Storage | undefined;

const refreshBufferSeconds = 15;
const lockTimeout = 10000;
const logoutTimeout = 150;

const unrecoverableErrors = [
  InvalidTokenError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  NotSupportedError,
  UnauthorizedError,
];

/**
 * Handles authentication on client side.
 *
 * Can be used to:
 * - Login/logout
 * - Refresh token
 * - Impersonate/unimpersonate
 * - Reset secret
 * - Check secret
 *
 * @template AdditionalTokenPayload Type of additional token payload
 * @template AuthenticationData Type of additional authentication data
 * @template AdditionalInitSecretResetData Type of additional secret reset data
 */
@Singleton()
export class AuthenticationClientService<AdditionalTokenPayload extends Record = Record, AuthenticationData = any, AdditionalInitSecretResetData = void> implements AfterResolve, AsyncDisposable {
  private readonly client = inject(AUTHENTICATION_API_CLIENT) as InstanceType<ApiClient<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>>>;
  private readonly errorSubject = new Subject<Error>();
  private readonly tokenUpdateBus = inject(MessageBus<TokenPayload<AdditionalTokenPayload> | undefined>, tokenUpdateBusName);
  private readonly loggedOutBus = inject(MessageBus<void>, loggedOutBusName);
  private readonly forceRefreshToken = new CancellationToken();
  private readonly lock = inject(Lock, refreshLockResource);
  private readonly logger = inject(Logger, 'AuthenticationService');
  private readonly disposeToken = new CancellationToken();

  private clockOffset = 0;

  /**
   * Observable for authentication errors.
   * Emits when a refresh fails.
   */
  readonly error$ = this.errorSubject.asObservable();

  /** Current token */
  readonly token = signal<TokenPayload<AdditionalTokenPayload> | undefined>(undefined);

  /** Whether the user is logged in */
  readonly isLoggedIn = computed(() => isDefined(this.token()));

  /** Current subject */
  readonly subject = computed(() => this.token()?.subject);

  /** Current session id */
  readonly sessionId = computed(() => this.token()?.sessionId);

  /** Current impersonator */
  readonly impersonator = computed(() => this.token()?.impersonator);

  /** Whether the user is impersonated */
  readonly impersonated = computed(() => isDefined(this.impersonator()));

  /** Current token */
  readonly token$ = toObservable(this.token);

  /** Emits when token is available (not undefined) */
  readonly definedToken$ = this.token$.pipe(filter(isDefined));

  /** Emits when a valid token is available (not undefined and not expired) */
  readonly validToken$ = this.definedToken$.pipe(filter((token) => token.exp > this.estimatedServerTimestampSeconds()));

  /** Current subject */
  readonly subject$ = toObservable(this.subject);

  /** Emits when subject is available */
  readonly definedSubject$ = this.subject$.pipe(filter(isDefined));

  /** Current session id */
  readonly sessionId$ = toObservable(this.sessionId);

  /** Emits when session id is available */
  readonly definedSessionId$ = this.sessionId$.pipe(filter(isDefined));

  /** Whether the user is logged in */
  readonly isLoggedIn$ = toObservable(this.isLoggedIn);

  /** Emits when the user logs out */
  readonly loggedOut$ = this.loggedOutBus.allMessages$;

  private get authenticationData(): AuthenticationData {
    return this.readFromStorage(authenticationDataStorageKey) as AuthenticationData;
  }

  private set authenticationData(data: AuthenticationData | undefined) {
    this.writeToStorage(authenticationDataStorageKey, data);
  }

  private get impersonatorAuthenticationData(): AuthenticationData {
    return this.readFromStorage(impersonatorAuthenticationDataStorageKey) as AuthenticationData;
  }

  private set impersonatorAuthenticationData(data: AuthenticationData | undefined) {
    this.writeToStorage(impersonatorAuthenticationDataStorageKey, data);
  }

  /**
   * Get current token or throw if not available
   * @throws Will throw if token is not available
   */
  get definedToken(): TokenPayload<AdditionalTokenPayload> {
    return assertDefinedPass(this.token(), 'No token available.');
  }

  /**
   * Get current subject or throw if not available
   * @throws Will throw if subject is not available
   */
  get definedSubject(): string {
    return this.definedToken.subject;
  }

  /**
   * Get current session id or throw if not available
   * @throws Will throw if session id is not available
   */
  get definedSessionId(): string {
    return this.definedToken.sessionId;
  }

  /** Whether a valid token is available (not undefined and not expired) */
  get hasValidToken(): boolean {
    return (this.token()?.exp ?? 0) > this.estimatedServerTimestampSeconds();
  }

  constructor(@Inject(INITIAL_AUTHENTICATION_DATA) @Optional() initialAuthenticationData: AuthenticationData | undefined) {
    if (isUndefined(this.authenticationData)) {
      this.authenticationData = initialAuthenticationData;
    }
  }

  /** @internal */
  [afterResolve](): void {
    this.initialize();
  }

  /**
   * Initializes the service.
   * Loads token from storage and starts refresh loop.
   *
   * @internal
   */
  initialize(): void {
    this.loadToken();
    this.tokenUpdateBus.messages$.subscribe((token) => this.token.set(token));

    void this.refreshLoop();
  }

  /** @internal */
  async [disposeAsync](): Promise<void> {
    await this.dispose();
  }

  /**
   * Disposes the service.
   * Stops refresh loop and completes subjects.
   */
  async dispose(): Promise<void> {
    this.disposeToken.set();
    this.errorSubject.complete();
    await this.loggedOutBus.dispose();
    await this.tokenUpdateBus.dispose();
  }

  /**
   * Set additional authentication data
   * @param data The data to set
   */
  setAdditionalData(data: AuthenticationData): void {
    this.authenticationData = data;
  }

  /**
   * Login with subject and secret
   * @param subject The subject to login with
   * @param secret The secret to login with
   * @param data Additional authentication data
   */
  async login(subject: string, secret: string, data?: AuthenticationData): Promise<void> {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    const [token] = await Promise.all([
      this.client.login({ subject, secret, data: this.authenticationData }),
      this.syncClock(),
    ]);

    this.setNewToken(token);
  }

  /**
   * Logout from the current session.
   * This will attempt to end the session on the server and then clear local credentials.
   */
  async logout(): Promise<void> {
    try {
      await Promise.race([
        this.client.endSession(),
        timeout(logoutTimeout),
      ]).catch((error: unknown) => this.logger.error(error as Error));
    }
    finally {
      // Always clear the local token, even if the server call fails.
      this.setNewToken(undefined);
      this.loggedOutBus.publishAndForget();
    }
  }

  /**
   * Force an immediate refresh of the token.
   * @param data Additional authentication data
   */
  requestRefresh(data?: AuthenticationData): void {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    this.forceRefreshToken.set();
  }

  /**
   * Refresh the token.
   * @param data Additional authentication data
   */
  async refresh(data?: AuthenticationData): Promise<void> {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    try {
      const [token] = await Promise.all([
        this.client.refresh({ data: this.authenticationData }),
        this.syncClock(),
      ]);

      this.setNewToken(token);
    }
    catch (error) {
      await this.handleRefreshError(error as Error);
      throw error;
    }
  }

  /**
   * Impersonate a subject.
   * @param subject The subject to impersonate
   * @param data Additional authentication data for the impersonated session
   */
  async impersonate(subject: string, data?: AuthenticationData): Promise<void> {
    if (this.impersonated()) {
      throw new Error('Already impersonating. Please unimpersonate first.');
    }

    await this.lock.use(lockTimeout, true, async () => {
      this.impersonatorAuthenticationData = this.authenticationData;
      this.authenticationData = data;

      try {
        const token = await this.client.impersonate({ subject, data: data! });
        this.setNewToken(token);
      }
      catch (error) {
        // Rollback authentication data on failure
        this.authenticationData = this.impersonatorAuthenticationData;
        this.impersonatorAuthenticationData = undefined;
        await this.handleRefreshError(error as Error);
        throw error;
      }
    });
  }

  /**
   * End impersonation and return to the original user session.
   * @param data Additional authentication data. If not provided, the data from before impersonation is used.
   */
  async unimpersonate(data?: AuthenticationData): Promise<void> {
    await this.lock.use(lockTimeout, true, async () => {
      const newData = data ?? this.impersonatorAuthenticationData;

      try {
        const token = await this.client.unimpersonate({ data: newData });
        this.authenticationData = newData;
        this.impersonatorAuthenticationData = undefined;

        this.setNewToken(token);
      }
      catch (error) {
        await this.handleRefreshError(error as Error);
        throw error;
      }
    });
  }

  /**
   * Change the secret for a subject.
   * @param subject The subject to change the secret for
   * @param currentSecret The current secret
   * @param newSecret The new secret
   */
  async changeSecret(subject: string, currentSecret: string, newSecret: string): Promise<void> {
    await this.client.changeSecret({ subject, currentSecret, newSecret });
  }

  /**
   * Initialize a secret reset.
   * @param subject The subject to reset the secret for
   * @param data Additional data for secret reset
   */
  async initResetSecret(subject: string, data: AdditionalInitSecretResetData): Promise<void> {
    await this.client.initSecretReset({ subject, data });
  }

  /**
   * Reset a secret using a reset token.
   * @param token The secret reset token
   * @param newSecret The new secret
   */
  async resetSecret(token: string, newSecret: string): Promise<void> {
    await this.client.resetSecret({ token, newSecret });
  }

  /**
   * Check a secret for requirements.
   * @param secret The secret to check
   * @returns The result of the check
   */
  async checkSecret(secret: string): Promise<SecretCheckResult> {
    return await this.client.checkSecret({ secret });
  }

  private setNewToken(token: TokenPayload<AdditionalTokenPayload> | undefined): void {
    this.saveToken(token);
    this.token.set(token);
    this.tokenUpdateBus.publishAndForget(token);
  }

  private async refreshLoop(): Promise<void> {
    if (this.isLoggedIn()) {
      await this.syncClock();
    }

    while (this.disposeToken.isUnset) {
      try {
        // Use a non-blocking lock to ensure only one tab/instance runs the refresh logic at a time.
        await this.lock.use(0, false, async () => await this.refreshLoopIteration());

        // Calculate delay until the next refresh check.
        // The buffer ensures we refresh *before* the token actually expires.
        const delay = ((this.token()?.exp ?? 0) - this.estimatedServerTimestampSeconds() - refreshBufferSeconds) * millisecondsPerSecond;

        await firstValueFrom(race([timer(delay), this.disposeToken, this.forceRefreshToken]));
      }
      catch {
        await firstValueFrom(race([timer(5000), this.disposeToken, this.forceRefreshToken]));
      }
    }
  }

  private async refreshLoopIteration(): Promise<void> {
    // Wait for a token to be available or for the service to be disposed.
    const token = await firstValueFrom(race([this.definedToken$, this.disposeToken]));

    if (isUndefined(token)) {
      return;
    }

    const needsRefresh = this.estimatedServerTimestampSeconds() >= (token.exp - refreshBufferSeconds);

    if (this.forceRefreshToken.isSet || needsRefresh) {
      this.forceRefreshToken.unset();
      await this.refresh(); // Errors are caught by the outer loop
    }
  }

  private async handleRefreshError(error: Error): Promise<void> {
    this.logger.error(error);
    this.errorSubject.next(error);

    if (unrecoverableErrors.some((errorType) => error instanceof errorType)) {
      await this.logout();
    }
  }

  private estimatedServerTimestampSeconds(): number {
    return currentTimestampSeconds() + this.clockOffset;
  }

  private async syncClock(): Promise<void> {
    try {
      const serverTimestamp = await this.client.timestamp();
      this.clockOffset = serverTimestamp - currentTimestampSeconds();
    }
    catch (error) {
      this.logger.warn(`Failed to synchronize clock with server: ${formatError(error)}`);
      this.clockOffset = 0;
    }
  }

  private saveToken(token: TokenPayload<AdditionalTokenPayload> | undefined): void {
    this.writeToStorage(tokenStorageKey, token);
  }

  private loadToken(): void {
    const token = this.readFromStorage<TokenPayload<AdditionalTokenPayload>>(tokenStorageKey);
    this.token.set(token);
  }

  private readFromStorage<T>(key: string): T | undefined {
    try {
      const serialized = localStorage?.getItem(key);

      if (isNullOrUndefined(serialized)) {
        return undefined;
      }

      return JSON.parse(serialized) as T;
    }
    catch (error) {
      this.logger.warn(`Failed to read and parse from localStorage key "${key}": ${formatError(error)}`);
      return undefined;
    }
  }

  private writeToStorage(key: string, value: unknown): void {
    try {
      if (isUndefined(value)) {
        localStorage?.removeItem(key);
      }
      else {
        const serialized = JSON.stringify(value);
        localStorage?.setItem(key, serialized);
      }
    }
    catch (error) {
      this.logger.warn(`Failed to write to localStorage key "${key}": ${formatError(error)}`);
    }
  }
}
