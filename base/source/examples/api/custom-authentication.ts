/* eslint-disable max-classes-per-file */
import '#/polyfills.js';

import type { EmptyObject } from 'type-fest';
import { Agent } from 'undici';

import { configureApiServer } from '#/api/server/index.js';
import { Application } from '#/application/application.js';
import { AuthenticationClientService, configureAuthenticationClient, getAuthenticationApiClient } from '#/authentication/client/index.js';
import { AuthenticationAncillaryService } from '#/authentication/index.js';
import { AuthenticationApiController } from '#/authentication/server/authentication.api-controller.js';
import { AuthenticationService as AuthenticationServerService } from '#/authentication/server/authentication.service.js';
import { configureAuthenticationServer } from '#/authentication/server/module.js';
import { MongoAuthenticationCredentialsRepository, configureMongoAuthenticationCredentialsRepository } from '#/authentication/server/mongo/mongo-authentication-credentials.repository.js';
import { MongoAuthenticationSessionRepository, configureMongoAuthenticationSessionRepository } from '#/authentication/server/mongo/mongo-authentication-session.repository.js';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici.adapter.js';
import { configureHttpClient } from '#/http/client/module.js';
import { configureNodeHttpServer } from '#/http/server/node/module.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectAsync } from '#/injector/inject.js';
import { configureLocalMessageBus } from '#/message-bus/local/module.js';
import { WebServerModule } from '#/module/modules/index.js';
import { Property, emptyObjectSchema } from '#/schema/index.js';
import { configureDefaultSignalsImplementation } from '#/signals/implementation/configure.js';
import { first } from '#/utils/iterable-helpers/first.js';
import { skip } from '#/utils/iterable-helpers/skip.js';
import { timeout } from '#/utils/timing.js';

class LocalStoragePolyfill implements Storage {
  readonly #storage = new Map<string, string>();

  get length(): number {
    return this.#storage.size;
  }

  clear(): void {
    throw new Error('Method not implemented.');
  }

  getItem(key: string): string | null {
    return this.#storage.get(key) ?? null;
  }

  key(index: number): string | null {
    return first(skip(this.#storage, index))[0];
  }

  removeItem(key: string): void {
    this.#storage.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#storage.set(key, value);
  }
}

globalThis.localStorage = new LocalStoragePolyfill();

class CustomTokenPaylod {
  @Property()
  deviceRegistrationId: string;
}

class AuthenticationData {
  @Property()
  deviceId: string;
}

const CustomAuthenticationApiClient = getAuthenticationApiClient(CustomTokenPaylod, AuthenticationData, emptyObjectSchema);

@Singleton()
class CustomAuthenticationAncillaryService extends AuthenticationAncillaryService<CustomTokenPaylod, AuthenticationData> {
  override  getTokenPayload(_subject: string, authenticationData: AuthenticationData): CustomTokenPaylod | Promise<CustomTokenPaylod> {
    return { deviceRegistrationId: `registration:${authenticationData.deviceId}` };
  }

  override resolveSubject(): string | Promise<string> {
    throw new Error('Method not implemented.');
  }

  override handleInitSecretReset(): void | Promise<void> {
    throw new Error('Method not implemented.');
  }

  override canImpersonate(): boolean | Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}

async function serverTest(): Promise<void> {
  const authenticationService = await injectAsync(AuthenticationServerService);
  await authenticationService.setCredentials('foobar', 'supersecret-dupidupudoo9275');
}

async function clientTest(): Promise<void> {
  const authenticationService = inject<AuthenticationClientService<CustomTokenPaylod, AuthenticationData, EmptyObject>>(AuthenticationClientService);

  await timeout(1500); // allow server to initialize

  authenticationService.initialize();

  await authenticationService.login('foobar', 'supersecret-dupidupudoo9275');
  authenticationService.token$.subscribe((token) => console.log({ token }));

  Application.requestShutdown();
}

async function test(): Promise<void> {
  await Promise.all([
    serverTest(),
    clientTest()
  ]);

  await Application.shutdown();
}

function bootstrap(): void {
  configureDefaultSignalsImplementation();

  configureAuthenticationServer({
    serviceOptions: { secret: 'djp0fq23576aq' },
    credentialsRepository: MongoAuthenticationCredentialsRepository,
    sessionRepository: MongoAuthenticationSessionRepository,
    authenticationAncillaryService: CustomAuthenticationAncillaryService
  });

  configureMongoAuthenticationCredentialsRepository({ collection: 'credentials' });
  configureMongoAuthenticationSessionRepository({ collection: 'sessions' });

  configureLocalMessageBus();

  configureAuthenticationClient({
    authenticationApiClient: CustomAuthenticationApiClient,
    initialAuthenticationData: ({ deviceId: 'my-device' }) satisfies AuthenticationData
  });

  configureNodeHttpServer();
  configureApiServer({ controllers: [AuthenticationApiController] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  configureHttpClient({ baseUrl: 'http://localhost:8000' });
}

Application.run({ bootstrap }, WebServerModule, test);
