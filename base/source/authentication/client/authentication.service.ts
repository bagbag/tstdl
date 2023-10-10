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
import type { Record } from '#/types.js';
import { currentTimestampSeconds } from '#/utils/date-time.js';
import { timeout } from '#/utils/timing.js';
import { assertDefinedPass, isDefined, isNullOrUndefined, isString, isUndefined } from '#/utils/type-guards.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import type { SecretCheckResult, TokenPayload } from '../models/index.js';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens.js';

const tokenStorageKey = 'AuthenticationService:token';
const authenticationDataStorageKey = 'AuthenticationService:authentication-data';
const tokenUpdateBusName = 'AuthenticationService:tokenUpdate';
const loggedOutBusName = 'AuthenticationService:loggedOut';
const refreshLockResource = 'AuthenticationService:refresh';

@Singleton()
export class AuthenticationClientService<AdditionalTokenPayload extends Record = Record, AuthenticationData = any> implements AfterResolve, AsyncDisposable {
  private readonly client = inject(AUTHENTICATION_API_CLIENT) as InstanceType<ApiClient<AuthenticationApiDefinition<TokenPayload<AdditionalTokenPayload>, any>>>;
  private readonly errorSubject = new Subject<Error>();
  private readonly tokenUpdateBus = inject(MessageBus<TokenPayload<AdditionalTokenPayload> | undefined>, tokenUpdateBusName);
  private readonly loggedOutBus = inject(MessageBus<void>, loggedOutBusName);
  private readonly forceRefreshToken = new CancellationToken();
  private readonly refreshLock = inject(Lock, refreshLockResource, { optional: true });
  private readonly logger = inject(Logger, 'AuthenticationService');
  private readonly disposeToken = new CancellationToken();

  readonly error$ = this.errorSubject.asObservable();

  readonly token = signal<TokenPayload<AdditionalTokenPayload> | undefined>(undefined);
  readonly isLoggedIn = computed(() => isDefined(this.token()));
  readonly subject = computed(() => this.token()?.subject);
  readonly sessionId = computed(() => this.token()?.sessionId);

  readonly token$ = toObservable(this.token);
  readonly definedToken$ = this.token$.pipe(filter(isDefined));
  readonly validToken$ = this.definedToken$.pipe(filter((token) => token.exp > currentTimestampSeconds()));

  readonly subject$ = toObservable(this.subject);
  readonly definedSubject$ = this.subject$.pipe(filter(isDefined));

  readonly sessionId$ = toObservable(this.sessionId);
  readonly definedSessionId$ = this.sessionId$.pipe(filter(isDefined));

  readonly isLoggedIn$ = toObservable(this.isLoggedIn);
  readonly loggedOut$ = this.loggedOutBus.allMessages$;

  private get authenticationData(): AuthenticationData {
    const data = localStorage.getItem(authenticationDataStorageKey);
    return isNullOrUndefined(data) ? undefined as AuthenticationData : JSON.parse(data) as AuthenticationData;
  }

  private set authenticationData(data: AuthenticationData | undefined) {
    if (isUndefined(data)) {
      localStorage.removeItem(authenticationDataStorageKey);
    }
    else {
      const json = JSON.stringify(data);
      localStorage.setItem(authenticationDataStorageKey, json);
    }
  }

  get definedToken(): TokenPayload<AdditionalTokenPayload> {
    return assertDefinedPass(this.token(), 'No token available.');
  }

  get definedSubject(): string {
    return this.definedToken.subject;
  }

  get definedSessionId(): string {
    return this.definedToken.sessionId;
  }

  get hasValidToken(): boolean {
    return (this.token()?.exp ?? 0) > currentTimestampSeconds();
  }

  constructor(@Inject(INITIAL_AUTHENTICATION_DATA) @Optional() initialAuthenticationData: AuthenticationData | undefined) {
    if (isUndefined(this.authenticationData)) {
      this.authenticationData = initialAuthenticationData;
    }
  }

  [afterResolve](): void {
    this.initialize();
  }

  initialize(): void {
    this.loadToken();
    this.tokenUpdateBus.messages$.subscribe((token) => this.token.set(token));

    void this.refreshLoop();
  }

  async [disposeAsync](): Promise<void> {
    await this.dispose();
  }

  async dispose(): Promise<void> {
    this.disposeToken.set();
    this.errorSubject.complete();
    await this.loggedOutBus.dispose();
    await this.tokenUpdateBus.dispose();
  }

  setAdditionalData(data: AuthenticationData): void {
    this.authenticationData = data;
  }

  async login(subject: string, secret: string, data?: AuthenticationData): Promise<void> {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    const token = await this.client.token({ subject, secret, data: this.authenticationData });
    this.setNewToken(token);
  }

  async logout(): Promise<void> {
    try {
      await Promise.race([
        this.client.endSession(),
        timeout(150)
      ]).catch((error) => this.logger.error(error as Error));
    }
    finally {
      this.setNewToken(undefined);
      this.loggedOutBus.publishAndForget();
    }
  }

  requestRefresh(data?: AuthenticationData): void {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    this.forceRefreshToken.set();
  }

  async refresh(data?: AuthenticationData): Promise<void> {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    try {
      const token = await this.client.refresh({ data: this.authenticationData });
      this.setNewToken(token);
    }
    catch (error) {
      await this.handleRefreshError(error as Error);
      throw error;
    }
  }

  async initResetSecret(subject: string): Promise<void> {
    await this.client.initResetSecret({ subject });
  }

  async resetSecret(token: string, newSecret: string): Promise<void> {
    await this.client.resetSecret({ token, newSecret });
  }

  async checkSecret(secret: string): Promise<SecretCheckResult> {
    return this.client.checkSecret({ secret });
  }

  private saveToken(token: TokenPayload<AdditionalTokenPayload> | undefined): void {
    if (isNullOrUndefined(token)) {
      localStorage.removeItem(tokenStorageKey);
    }
    else {
      const serialized = JSON.stringify(token);
      localStorage.setItem(tokenStorageKey, serialized);
    }
  }

  private loadToken(): void {
    if (isUndefined(localStorage)) {
      return;
    }

    const existingSerializedToken = localStorage.getItem(tokenStorageKey);

    const token = isString(existingSerializedToken)
      ? JSON.parse(existingSerializedToken) as TokenPayload<AdditionalTokenPayload>
      : undefined;

    this.token.set(token);
  }

  private setNewToken(token: TokenPayload<AdditionalTokenPayload> | undefined): void {
    this.saveToken(token);
    this.token.set(token);
    this.tokenUpdateBus.publishAndForget(token);
  }

  private async refreshLoop(): Promise<void> {
    while (this.disposeToken.isUnset) {
      try {
        if (isDefined(this.refreshLock)) {
          await this.refreshLock.use(0, false, async () => this.refreshLoopIteration());
        }
        else {
          await this.refreshLoopIteration();
        }

        await firstValueFrom(race([timer(2500), this.disposeToken, this.forceRefreshToken]));
      }
      catch {
        await firstValueFrom(race([timer(5000), this.disposeToken, this.forceRefreshToken]));
      }
    }
  }

  private async refreshLoopIteration(): Promise<void> {
    const token = await firstValueFrom(race([this.definedToken$, this.disposeToken]));

    if (isUndefined(token)) {
      return;
    }

    if (this.forceRefreshToken.isSet || (currentTimestampSeconds() >= (token.exp - 60))) {
      this.forceRefreshToken.unset();
      await this.refresh();
    }
  }

  private async handleRefreshError(error: Error): Promise<void> {
    this.logger.error(error);
    this.errorSubject.next(error);

    if ((error instanceof InvalidTokenError) || (error instanceof NotFoundError) || (error instanceof BadRequestError) || (error instanceof ForbiddenError) || (error instanceof NotSupportedError) || (error instanceof UnauthorizedError)) {
      await this.logout();
    }
  }
}
