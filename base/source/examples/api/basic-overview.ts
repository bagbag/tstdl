/* eslint-disable max-classes-per-file */
import { compileClient } from '#/api/client/index.js';
import type { ApiController, ApiRequestContext, ApiServerResult } from '#/api/index.js';
import { defineApi } from '#/api/index.js';
import { apiController, configureApiServer } from '#/api/server/index.js';
import { Application } from '#/application/application.js';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici.adapter.js';
import { configureHttpClient } from '#/http/client/module.js';
import { configureNodeHttpServer } from '#/http/server/node/module.js';
import { inject } from '#/injector/inject.js';
import { WebServerModule } from '#/module/modules/web-server.module.js';
import { Property, array, boolean, number, object } from '#/schema/index.js';
import { timeout } from '#/utils/timing.js';
import { Agent } from 'undici';

class User {
  @Property({ coerce: true })
  id: number;

  @Property()
  name: string;
}

const users: User[] = [
  { id: 1, name: 'Alice' },
  { id: 3, name: 'Bob' }
];

type UsersApiDefinition = typeof usersApiDefinition;

const usersApiDefinition = defineApi({
  resource: 'users', // /api/:version/users
  endpoints: {
    load: {
      method: 'GET', // GET is default
      resource: ':id', // => /api/v1/users/:id
      version: 1,
      parameters: object({
        id: number({ coerce: true })
      }),
      result: User
    },
    loadAll: { // => /api/v1/users
      result: array(User)
    },
    delete: {
      method: 'DELETE',
      resource: ':id', // => /api/v1/users/:id
      parameters: object({
        id: number({ coerce: true })
      }),
      result: boolean()
    }
  }
});

@apiController(usersApiDefinition)
class UserApi implements ApiController<UsersApiDefinition> {
  load({ parameters }: ApiRequestContext<UsersApiDefinition, 'load'>): ApiServerResult<UsersApiDefinition, 'load'> {
    return users.find((user) => user.id == parameters.id)!;
  }

  loadAll(this: UserApi): ApiServerResult<UsersApiDefinition, 'loadAll'> {
    return users;
  }

  delete({ parameters }: ApiRequestContext<UsersApiDefinition, 'delete'>): ApiServerResult<UsersApiDefinition, 'delete'> {
    const index = users.findIndex((user) => user.id == parameters.id);

    if (index == -1) {
      return false;
    }

    users.splice(index, 1);
    return true;
  }
}

const UserApiClient = compileClient(usersApiDefinition);

async function clientTest(): Promise<void> {
  const userApiClient = inject(UserApiClient);

  await timeout(250); // allow server to start

  const allUsers = await userApiClient.loadAll();
  console.log(allUsers);

  await userApiClient.delete({ id: allUsers[0]!.id });

  const allUsersAfterDelete = await userApiClient.loadAll();
  console.log(allUsersAfterDelete);

  Application.requestShutdown();
}

async function main(): Promise<void> {
  configureNodeHttpServer();
  configureApiServer({ controllers: [UserApi] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  configureHttpClient({ baseUrl: 'http://localhost:8000' });

  Application.run(WebServerModule, clientTest);
}

void main();
