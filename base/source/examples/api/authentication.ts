/* eslint-disable max-classes-per-file */
import { configureApiServer } from '#/api/server';
import { Application } from '#/application';
import { AuthenticationApiClient, AuthenticationService as AuthenticationClientService, configureAuthenticationClient } from '#/authentication/client';
import { AuthenticationApiController } from '#/authentication/server/authentication.api-controller';
import { AuthenticationService as AuthenticationServerService } from '#/authentication/server/authentication.service';
import { configureAuthenticationServer } from '#/authentication/server/module';
import { configureMongoAuthenticationCredentialsRepository, MongoAuthenticationCredentialsRepository } from '#/authentication/server/mongo/mongo-authentication-credentials.repository';
import { configureMongoAuthenticationSessionRepository, MongoAuthenticationSessionRepository } from '#/authentication/server/mongo/mongo-authentication-session.repository';
import { container } from '#/container';
import { HTTP_CLIENT_OPTIONS } from '#/http';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter';
import { configureNodeHttpServer } from '#/http/server/node';
import { configureLocalMessageBus } from '#/message-bus/local';
import { WebServerModule } from '#/module/modules';
import { timeout } from '#/utils/timing';
import { firstValueFrom } from 'rxjs';
import { Agent } from 'undici';

configureAuthenticationServer({
  serviceOptions: { secret: 'foobar' },
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
  await authenticationService.setCredentials('foobar', 'supersecret');
}

async function clientTest(): Promise<void> {
  await timeout(500); // allow server to initialize

  const authenticationService = container.resolve(AuthenticationClientService);
  authenticationService.initialize();

  await authenticationService.login('foobar', 'supersecret');
  const token = await firstValueFrom(authenticationService.token$);

  console.log({ token });
}

function main(): void {
  configureNodeHttpServer();
  configureApiServer({ controllers: [AuthenticationApiController] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });

  container.register(HTTP_CLIENT_OPTIONS, { useValue: { baseUrl: 'http://localhost:8000' } });

  Application.run(WebServerModule);
}

main();

void serverTest().then(async () => clientTest()).catch((error) => console.error(error)).then(async () => timeout(1000)).then(async () => Application.shutdown());
