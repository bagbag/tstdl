import type { ApiClient } from '#/api/client';
import type { AfterResolve } from '#/container';
import { afterResolve, inject, optional, resolveArg, singleton } from '#/container';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { MessageBusArgument } from '#/message-bus';
import { MessageBus } from '#/message-bus';
import { currentTimestampSeconds } from '#/utils/date-time';
import { timeout } from '#/utils/timing';
import { isDefined, isNullOrUndefined, isString, isUndefined } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import { BehaviorSubject, filter, firstValueFrom, map, Subject } from 'rxjs';
import type { AuthenticationApiDefinition } from '../authentication.api';
import type { TokenPayload } from '../models';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens';

const tokenStorageKey = 'AuthenticationService:token';
const tokenUpdateBusName = 'AuthenticationService:tokenUpdate';

@singleton()
export class AuthenticationService<AdditionalTokenPayload, AuthenticationData> implements AfterResolve {
  private readonly client: InstanceType<ApiClient<AuthenticationApiDefinition<TokenPayload<AdditionalTokenPayload>, any>>>;
  private readonly errorSubject: Subject<Error>;
  private readonly tokenSubject: BehaviorSubject<TokenPayload<AdditionalTokenPayload> | undefined>;
  private readonly tokenUpdateBus: MessageBus<void>;
  private readonly logger: Logger;

  private authenticationData: AuthenticationData | undefined;

  readonly error$: Observable<Error>;
  readonly token$: Observable<TokenPayload<AdditionalTokenPayload> | undefined>;
  readonly definedToken$: Observable<TokenPayload<AdditionalTokenPayload>>;
  readonly loggedIn$: Observable<boolean>;

  constructor(
    @inject(AUTHENTICATION_API_CLIENT) client: InstanceType<ApiClient<AuthenticationApiDefinition<TokenPayload<AdditionalTokenPayload>, AuthenticationData>>>,
    @resolveArg<MessageBusArgument>(tokenUpdateBusName) tokenUpdateBus: MessageBus<void>,
    @inject(INITIAL_AUTHENTICATION_DATA) @optional() initialAuthenticationData: AuthenticationData | undefined,
    @resolveArg<LoggerArgument>('AuthenticationService') logger: Logger
  ) {
    this.client = client;
    this.tokenUpdateBus = tokenUpdateBus;
    this.authenticationData = initialAuthenticationData;
    this.logger = logger;

    this.errorSubject = new Subject();
    this.tokenSubject = new BehaviorSubject<TokenPayload<AdditionalTokenPayload> | undefined>(undefined);

    this.error$ = this.errorSubject.asObservable();
    this.token$ = this.tokenSubject.asObservable();
    this.definedToken$ = this.token$.pipe(filter(isDefined));
    this.loggedIn$ = this.token$.pipe(map(isDefined));
  }

  [afterResolve](): void {
    this.initialize();
  }

  initialize(): void {
    this.loadToken();
    this.tokenUpdateBus.messages$.subscribe(() => this.loadToken());

    void this.refreshLoop();
  }

  setAdditionalData(data: AuthenticationData): void {
    this.authenticationData = data;
  }

  async login(subject: string, secret: string, data?: AuthenticationData): Promise<void> {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    const token = await this.client.token({ subject, secret, data: this.authenticationData });
    this.tokenSubject.next(token as TokenPayload<AdditionalTokenPayload>);
  }

  async logout(): Promise<void> {
    await this.client.endSession();
    this.saveToken(undefined);
    this.tokenSubject.next(undefined);
  }

  async refresh(data?: AuthenticationData): Promise<void> {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    const token = await this.client.refresh({ data: this.authenticationData });
    this.saveToken(token);
    this.tokenSubject.next(token as TokenPayload<AdditionalTokenPayload>);
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

  private async refreshLoop(): Promise<void> {
    while (true) {
      try {
        const token = await firstValueFrom(this.definedToken$);

        if (currentTimestampSeconds() >= (token.exp - 30)) {
          await this.refresh();
        }
      }
      catch (error) {
        this.logger.error(error as Error);
        this.errorSubject.next(error as Error);
        await timeout(2500);
      }
      finally {
        await timeout(2500);
      }
    }
  }
}
