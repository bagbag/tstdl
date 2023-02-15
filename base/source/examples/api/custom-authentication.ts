/* eslint-disable max-classes-per-file */
import { configureApiServer } from '#/api/server';
import { Application } from '#/application';
import { AuthenticationService as AuthenticationClientService, configureAuthenticationClient, getAuthenticationApiClient } from '#/authentication/client';
import { AuthenticationTokenPayloadProvider } from '#/authentication/server/authentication-token-payload.provider';
import { AuthenticationApiController } from '#/authentication/server/authentication.api-controller';
import { AuthenticationService as AuthenticationServerService } from '#/authentication/server/authentication.service';
import { configureAuthenticationServer } from '#/authentication/server/module';
import { configureMongoAuthenticationCredentialsRepository, MongoAuthenticationCredentialsRepository } from '#/authentication/server/mongo/mongo-authentication-credentials.repository';
import { configureMongoAuthenticationSessionRepository, MongoAuthenticationSessionRepository } from '#/authentication/server/mongo/mongo-authentication-session.repository';
import { container, singleton } from '#/container';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter';
import { configureHttpClient } from '#/http/client/module';
import { configureNodeHttpServer } from '#/http/server/node';
import { configureLocalMessageBus } from '#/message-bus/local';
import { WebServerModule } from '#/module/modules';
import { Property } from '#/schema';
import { timeout } from '#/utils/timing';
import { Agent } from 'undici';

class CustomTokenPaylod {
  @Property()
  deviceRegistrationId: string;
}

class AuthenticationData {
  @Property()
  deviceId: string;
}

@singleton()
class CustomTokenPayloadProvider extends AuthenticationTokenPayloadProvider<CustomTokenPaylod, AuthenticationData> {
  getTokenPayload(_subject: string, authenticationData: AuthenticationData): CustomTokenPaylod | Promise<CustomTokenPaylod> {
    return { deviceRegistrationId: `registration:${authenticationData.deviceId}` };
  }
}

configureAuthenticationServer({
  serviceOptions: { secret: 'djp0fq23576aq' },
  credentialsRepository: MongoAuthenticationCredentialsRepository,
  sessionRepository: MongoAuthenticationSessionRepository,
  tokenPayloadProvider: CustomTokenPayloadProvider
});

configureMongoAuthenticationCredentialsRepository({ collection: 'credentials' });
configureMongoAuthenticationSessionRepository({ collection: 'sessions' });

const CustomAuthenticationApiClient = getAuthenticationApiClient(CustomTokenPaylod, AuthenticationData);

configureAuthenticationClient({
  authenticationApiClient: CustomAuthenticationApiClient
});

configureLocalMessageBus();

async function serverTest(): Promise<void> {
  const authenticationService = await container.resolveAsync(AuthenticationServerService);
  await authenticationService.setCredentials('foobar', 'supersecret');
}

async function clientTest(): Promise<void> {
  await timeout(250); // allow server to initialize

  const authenticationService = container.resolve<AuthenticationClientService<CustomTokenPaylod, AuthenticationData>>(AuthenticationClientService);
  authenticationService.initialize();

  await authenticationService.login('foobar', 'supersecret', { deviceId: 'my-device' });
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
