/* eslint-disable max-classes-per-file */
import { configureApiServer } from '#/api/server/index.js';
import { Application } from '#/application/application.js';
import { AuthenticationApiClient } from '#/authentication/client/api.client.js';
import { AuthenticationService as AuthenticationClientService, configureAuthenticationClient } from '#/authentication/client/index.js';
import { AuthenticationApiController, AuthenticationService as AuthenticationServerService, configureAuthenticationServer } from '#/authentication/server/index.js';
import { configureMongoAuthenticationCredentialsRepository, MongoAuthenticationCredentialsRepository } from '#/authentication/server/mongo/mongo-authentication-credentials.repository.js';
import { configureMongoAuthenticationSessionRepository, MongoAuthenticationSessionRepository } from '#/authentication/server/mongo/mongo-authentication-session.repository.js';
import { container } from '#/container/index.js';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter.js';
import { configureHttpClient } from '#/http/client/module.js';
import { configureNodeHttpServer } from '#/http/server/node/module.js';
import { configureLocalMessageBus } from '#/message-bus/local/module.js';
import { WebServerModule } from '#/module/modules/web-server.module.js';
import { timeout } from '#/utils/timing.js';
import { Agent } from 'undici';

configureAuthenticationServer({
  serviceOptions: { secret: 'djp0fq23576aq' },
  credentialsRepository: MongoAuthenticationCredentialsRepository,
  sessionRepository: MongoAuthenticationSessionRepository
});

configureMongoAuthenticationCredentialsRepository({ collection: 'credentials' });
configureMongoAuthenticationSessionRepository({ collection: 'sessions' });

configureAuthenticationClient({
  authenticationApiClient: AuthenticationApiClient
});

configureLocalMessageBus();

async function serverTest(): Promise<void> {
  const authenticationService = await container.resolveAsync(AuthenticationServerService);
  await authenticationService.setCredentials('foobar', 'mysuperdupersecret-fvhc54w');
}

async function clientTest(): Promise<void> {
  await timeout(250); // allow server to initialize

  const authenticationService = container.resolve(AuthenticationClientService);
  authenticationService.initialize();

  const passwordCheckResult = await authenticationService.checkSecret('123456');
  console.log({ 'password check for "123456"': passwordCheckResult });

  await authenticationService.login('foobar', 'mysuperdupersecret-fvhc54w');
  authenticationService.token$.subscribe((token) => console.log({ token }));
}

function main(): void {
  configureNodeHttpServer();
  configureApiServer({ controllers: [AuthenticationApiController] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  configureHttpClient({ baseUrl: 'http://localhost:8000' });

  Application.run(WebServerModule);
}

main();

void serverTest().then(async () => clientTest()).catch((error) => console.error(error)).then(async () => Application.shutdown());
