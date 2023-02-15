import type { ApiClient } from '#/api/client';
import type { AfterResolve } from '#/container';
import { afterResolve, inject, optional, resolveArg, singleton } from '#/container';
import { disposer } from '#/core';
import type { AsyncDisposable } from '#/disposable';
import { disposeAsync } from '#/disposable';
import { InvalidTokenError } from '#/error/invalid-token.error';
import type { LockArgument } from '#/lock';
import { Lock } from '#/lock';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { MessageBusArgument } from '#/message-bus';
import { MessageBus } from '#/message-bus';
import type { Record } from '#/types';
import { CancellationToken } from '#/utils/cancellation-token';
import { currentTimestampSeconds } from '#/utils/date-time';
import { cancelableTimeout } from '#/utils/timing';
import { assertDefinedPass, isDefined, isNullOrUndefined, isString, isUndefined } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, firstValueFrom, map, race, Subject } from 'rxjs';
import type { AuthenticationApiDefinition } from '../authentication.api';
import type { TokenPayload } from '../models';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens';

const tokenStorageKey = 'AuthenticationService:token';
const tokenUpdateBusName = 'AuthenticationService:tokenUpdate';
const loggedOutBusName = 'AuthenticationService:loggedOut';
const refreshLockResource = 'AuthenticationService:refresh';

@singleton()
export class AuthenticationService<AdditionalTokenPayload = Record<never>, AuthenticationData = void> implements AfterResolve, AsyncDisposable {
  private readonly client: InstanceType<ApiClient<AuthenticationApiDefinition<TokenPayload<AdditionalTokenPayload>, any>>>;
  private readonly errorSubject: Subject<Error>;
  private readonly tokenSubject: BehaviorSubject<TokenPayload<AdditionalTokenPayload> | undefined>;
  private readonly tokenUpdateBus: MessageBus<TokenPayload<AdditionalTokenPayload> | undefined>;
  private readonly loggedOutBus: MessageBus<void>;
  private readonly refreshLock: Lock;
  private readonly logger: Logger;
  private readonly disposeToken: CancellationToken;

  private authenticationData: AuthenticationData | undefined;

  readonly error$: Observable<Error>;

  readonly token$: Observable<TokenPayload<AdditionalTokenPayload> | undefined>;
  readonly definedToken$: Observable<TokenPayload<AdditionalTokenPayload>>;

  readonly subject$: Observable<string | undefined>;
  readonly definedSubject$: Observable<string>;

  readonly sessionId$: Observable<string | undefined>;
  readonly definedSessionId$: Observable<string>;

  readonly isLoggedIn$: Observable<boolean>;
  readonly loggedOut$: Observable<void>;

  get isLoggedIn(): boolean {
    return isDefined(this.tokenSubject.value);
  }

  get token(): TokenPayload<AdditionalTokenPayload> | undefined {
    return this.tokenSubject.value;
  }

  get definedToken(): TokenPayload<AdditionalTokenPayload> {
    return assertDefinedPass(this.tokenSubject.value, 'No token available.');
  }

  get subject(): string | undefined {
    return this.token?.subject;
  }

  get definedSubject(): string {
    return this.definedToken.subject;
  }

  get sessionId(): string | undefined {
    return this.token?.sessionId;
  }

  get definedSessionId(): string {
    return this.definedToken.sessionId;
  }

  constructor(
    @inject(AUTHENTICATION_API_CLIENT) client: InstanceType<ApiClient<AuthenticationApiDefinition<TokenPayload<AdditionalTokenPayload>, AuthenticationData>>>,
    @resolveArg<MessageBusArgument>(tokenUpdateBusName) tokenUpdateBus: MessageBus<TokenPayload<AdditionalTokenPayload> | undefined>,
    @resolveArg<MessageBusArgument>(loggedOutBusName) loggedOutBus: MessageBus<void>,
    @resolveArg<LockArgument>(refreshLockResource) refreshLock: Lock,
    @inject(INITIAL_AUTHENTICATION_DATA) @optional() initialAuthenticationData: AuthenticationData | undefined,
    @resolveArg<LoggerArgument>('AuthenticationService') logger: Logger
  ) {
    this.client = client;
    this.tokenUpdateBus = tokenUpdateBus;
    this.loggedOutBus = loggedOutBus;
    this.refreshLock = refreshLock;
    this.authenticationData = initialAuthenticationData;
    this.logger = logger;

    this.disposeToken = new CancellationToken();
    this.errorSubject = new Subject();
    this.tokenSubject = new BehaviorSubject<TokenPayload<AdditionalTokenPayload> | undefined>(undefined);

    this.error$ = this.errorSubject.asObservable();
    this.token$ = this.tokenSubject.asObservable();
    this.definedToken$ = this.token$.pipe(filter(isDefined));
    this.subject$ = this.token$.pipe(map((token) => token?.subject), distinctUntilChanged());
    this.definedSubject$ = this.subject$.pipe(filter(isDefined));
    this.sessionId$ = this.token$.pipe(map((token) => token?.sessionId), distinctUntilChanged());
    this.definedSessionId$ = this.sessionId$.pipe(filter(isDefined));
    this.isLoggedIn$ = this.token$.pipe(map(isDefined), distinctUntilChanged());
    this.loggedOut$ = loggedOutBus.allMessages$;
  }

  [afterResolve](): void {
    this.initialize();
    disposer.add(this);
  }

  initialize(): void {
    this.loadToken();
    this.tokenUpdateBus.messages$.subscribe((token) => this.tokenSubject.next(token));

    void this.refreshLoop();
  }

  async [disposeAsync](): Promise<void> {
    await this.dispose();
  }

  async dispose(): Promise<void> {
    this.disposeToken.set();
    this.tokenSubject.complete();
    this.errorSubject.complete();
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
      await this.client.endSession();
    }
    finally {
      this.setNewToken(undefined);
      this.loggedOutBus.publishAndForget();
    }
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
      await this.handleError(error as Error);
      throw error;
    }
  }

  private saveToken(token: TokenPayload<AdditionalTokenPayload> | undefined): void {
    if (isUndefined(globalThis.localStorage)) {
      return;
    }

    if (isNullOrUndefined(token)) {
      localStorage.removeItem(tokenStorageKey);
    }
    else {
      const serialized = JSON.stringify(token);
      localStorage.setItem(tokenStorageKey, serialized);
    }
  }

  private loadToken(): void {
    if (isUndefined(globalThis.localStorage)) {
      return;
    }

    const existingSerializedToken = localStorage.getItem(tokenStorageKey);

    const token = isString(existingSerializedToken)
      ? JSON.parse(existingSerializedToken) as TokenPayload<AdditionalTokenPayload>
      : undefined;

    this.tokenSubject.next(token);
  }

  private setNewToken(token: TokenPayload<AdditionalTokenPayload> | undefined): void {
    this.saveToken(token);
    this.tokenSubject.next(token);
    this.tokenUpdateBus.publishAndForget(token);
  }

  private async refreshLoop(): Promise<void> {
    while (this.disposeToken.isUnset) {
      try {
        await this.refreshLock.use(0, false, async () => {
          const token = await firstValueFrom(race([this.definedToken$, this.disposeToken]));

          if (isUndefined(token)) {
            return;
          }

          if (currentTimestampSeconds() >= (token.exp - 60)) {
            await this.refresh();
          }
        });

        await cancelableTimeout(2500, this.disposeToken);
      }
      catch {
        await cancelableTimeout(5000, this.disposeToken);
      }
    }
  }

  private async handleError(error: Error): Promise<void> {
    this.logger.error(error);
    this.errorSubject.next(error);

    if (error instanceof InvalidTokenError) {
      await this.logout();
    }
  }
}