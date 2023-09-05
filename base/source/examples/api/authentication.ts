/* eslint-disable max-classes-per-file */
import '#/polyfills.js';

import { configureApiServer } from '#/api/server/index.js';
import { Application } from '#/application/application.js';
import { AuthenticationApiClient } from '#/authentication/client/api.client.js';
import { AuthenticationService as AuthenticationClientService, configureAuthenticationClient } from '#/authentication/client/index.js';
import { AuthenticationApiController, AuthenticationService as AuthenticationServerService, configureAuthenticationServer } from '#/authentication/server/index.js';
import { MongoAuthenticationCredentialsRepository, configureMongoAuthenticationCredentialsRepository } from '#/authentication/server/mongo/mongo-authentication-credentials.repository.js';
import { MongoAuthenticationSessionRepository, configureMongoAuthenticationSessionRepository } from '#/authentication/server/mongo/mongo-authentication-session.repository.js';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter.js';
import { configureHttpClient } from '#/http/client/module.js';
import { configureNodeHttpServer } from '#/http/server/node/module.js';
import { inject, injectAsync } from '#/injector/inject.js';
import { configureLocalMessageBus } from '#/message-bus/local/module.js';
import { WebServerModule } from '#/module/modules/web-server.module.js';
import { configureDefaultSignalsImplementation } from '#/signals/implementation/configure.js';
import { timeout } from '#/utils/timing.js';
import { Agent } from 'undici';

async function serverTest(): Promise<void> {
  const authenticationService = await injectAsync(AuthenticationServerService);
  await authenticationService.setCredentials('foobar', 'mysuperdupersecret-fvhc54w');
}

async function clientTest(): Promise<void> {
  const authenticationService = inject(AuthenticationClientService);
  authenticationService.initialize();
  await timeout(250); // allow server to initialize

  const passwordCheckResult = await authenticationService.checkSecret('123456');
  console.log({ 'password check for "123456"': passwordCheckResult });

  await authenticationService.login('foobar', 'mysuperdupersecret-fvhc54w');
  authenticationService.token$.subscribe((token) => console.log({ token }));
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
    sessionRepository: MongoAuthenticationSessionRepository
  });

  configureMongoAuthenticationCredentialsRepository({ collection: 'credentials' });
  configureMongoAuthenticationSessionRepository({ collection: 'sessions' });

  configureLocalMessageBus();

  configureAuthenticationClient({
    authenticationApiClient: AuthenticationApiClient
  });

  configureNodeHttpServer();
  configureApiServer({ controllers: [AuthenticationApiController] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  configureHttpClient({ baseUrl: 'http://localhost:8000' });
}

Application.run({ bootstrap }, WebServerModule, test);
