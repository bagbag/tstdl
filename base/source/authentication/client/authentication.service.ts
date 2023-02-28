import type { ApiClient } from '#/api/client/index.js';
import type { AfterResolve } from '#/container/index.js';
import { afterResolve, inject, optional, resolveArg, singleton } from '#/container/index.js';
import { disposer } from '#/core.js';
import type { AsyncDisposable } from '#/disposable/index.js';
import { disposeAsync } from '#/disposable/index.js';
import { InvalidTokenError } from '#/error/invalid-token.error.js';
import { Lock } from '#/lock/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { MessageBusArgument } from '#/message-bus/index.js';
import { MessageBus } from '#/message-bus/index.js';
import type { Record } from '#/types.js';
import { CancellationToken } from '#/utils/cancellation-token.js';
import { currentTimestampSeconds } from '#/utils/date-time.js';
import { cancelableTimeout, timeout } from '#/utils/timing.js';
import { assertDefinedPass, isDefined, isNullOrUndefined, isString, isUndefined } from '#/utils/type-guards.js';
import type { Observable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, firstValueFrom, map, race, Subject } from 'rxjs';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import type { SecretCheckResult, TokenPayload } from '../models/index.js';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens.js';

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
  private readonly refreshLock: Lock | undefined;
  private readonly logger: Logger;
  private readonly disposeToken: CancellationToken;

  private authenticationData: AuthenticationData | undefined;

  readonly error$: Observable<Error>;

  readonly token$: Observable<TokenPayload<AdditionalTokenPayload> | undefined>;
  readonly definedToken$: Observable<TokenPayload<AdditionalTokenPayload>>;
  readonly validToken$: Observable<TokenPayload<AdditionalTokenPayload>>;

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

  get hasValidToken(): boolean {
    return (this.token?.exp ?? 0) > currentTimestampSeconds();
  }

  constructor(
    @inject(AUTHENTICATION_API_CLIENT) client: InstanceType<ApiClient<AuthenticationApiDefinition<TokenPayload<AdditionalTokenPayload>, AuthenticationData>>>,
    @resolveArg<MessageBusArgument>(tokenUpdateBusName) tokenUpdateBus: MessageBus<TokenPayload<AdditionalTokenPayload> | undefined>,
    @resolveArg<MessageBusArgument>(loggedOutBusName) loggedOutBus: MessageBus<void>,
    @inject(Lock, refreshLockResource) @optional() refreshLock: Lock | undefined,
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
    this.validToken$ = this.definedToken$.pipe(filter((token) => token.exp > currentTimestampSeconds()));
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
      await Promise.race([
        this.client.endSession(),
        timeout(150)
      ]).catch((error) => console.error(error));
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
        if (isDefined(this.refreshLock)) {
          await this.refreshLock.use(0, false, async () => this.refreshLoopIteration());
        }
        else {
          await this.refreshLoopIteration();
        }

        await cancelableTimeout(2500, this.disposeToken);
      }
      catch {
        await cancelableTimeout(5000, this.disposeToken);
      }
    }
  }

  private async refreshLoopIteration(): Promise<void> {
    const token = await firstValueFrom(race([this.definedToken$, this.disposeToken]));

    if (isUndefined(token)) {
      return;
    }

    if (currentTimestampSeconds() >= (token.exp - 60)) {
      await this.refresh();
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
