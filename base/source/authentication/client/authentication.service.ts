import type { ApiClient } from '#/api/client';
import type { AfterResolve } from '#/container';
import { afterResolve, inject, resolveArg } from '#/container';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { MessageBusArgument } from '#/message-bus';
import { MessageBus } from '#/message-bus';
import { currentTimestampSeconds } from '#/utils/date-time';
import { timeout } from '#/utils/timing';
import { isDefined, isNullOrUndefined, isString } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import { BehaviorSubject, filter, firstValueFrom, map, Subject } from 'rxjs';
import type { AuthenticationApiDefinition } from '../authentication.api';
import type { TokenPayloadBase } from '../models';
import { AUTHENTICATION_API_CLIENT, INITIAL_AUTHENTICATION_DATA } from './tokens';

const tokenStorageKey = 'AuthenticationService:token';
const tokenUpdateBusName = 'AuthenticationService:tokenUpdate';

export class AuthenticationService<AdditionalTokenPayload extends TokenPayloadBase, AuthenticationData> implements AfterResolve {
  private readonly client: InstanceType<ApiClient<AuthenticationApiDefinition<AdditionalTokenPayload, any>>>;
  private readonly errorSubject: Subject<Error>;
  private readonly tokenSubject: BehaviorSubject<AdditionalTokenPayload | undefined>;
  private readonly tokenUpdateBus: MessageBus<void>;
  private readonly logger: Logger;

  private authenticationData: AuthenticationData | undefined;

  readonly error$: Observable<Error>;
  readonly token$: Observable<AdditionalTokenPayload | undefined>;
  readonly definedToken$: Observable<AdditionalTokenPayload>;
  readonly loggedIn$: Observable<boolean>;

  constructor(
    @inject(AUTHENTICATION_API_CLIENT) client: InstanceType<ApiClient<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>>>,
    @resolveArg<MessageBusArgument>(tokenUpdateBusName) tokenUpdateBus: MessageBus<void>,
    @inject(INITIAL_AUTHENTICATION_DATA) initialAuthenticationData: AuthenticationData,
    @resolveArg<LoggerArgument>('AuthenticationService') logger: Logger
  ) {
    this.client = client;
    this.tokenUpdateBus = tokenUpdateBus;
    this.authenticationData = initialAuthenticationData;
    this.logger = logger;

    this.errorSubject = new Subject();
    this.tokenSubject = new BehaviorSubject<AdditionalTokenPayload | undefined>(undefined);

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
    this.tokenSubject.next(token as AdditionalTokenPayload);
  }

  async logout(): Promise<void> {
    await this.client.endSession();
  }

  async refresh(data?: AuthenticationData): Promise<void> {
    if (isDefined(data)) {
      this.setAdditionalData(data);
    }

    const token = await this.client.refresh({ data: this.authenticationData });
    this.saveToken(token);
    this.tokenSubject.next(token as AdditionalTokenPayload);
  }

  private saveToken(token: AdditionalTokenPayload): void {
    if (isNullOrUndefined(token)) {
      localStorage.removeItem(tokenStorageKey);
    }
    else {
      const serialized = JSON.stringify(token);
      localStorage.setItem(tokenStorageKey, serialized);
    }
  }

  private loadToken(): void {
    const existingSerializedToken = localStorage.getItem(tokenStorageKey);

    if (isString(existingSerializedToken)) {
      const token = JSON.parse(existingSerializedToken) as AdditionalTokenPayload;
      this.tokenSubject.next(token);
    }
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
