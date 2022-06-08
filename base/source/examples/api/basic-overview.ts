/* eslint-disable max-classes-per-file */
import type { ApiController, ApiRequestData, ApiServerResult } from '#/api';
import { defineApi, rootResource } from '#/api';
import { compileClient } from '#/api/client';
import { apiController, configureApiModule } from '#/api/server';
import { Application } from '#/application';
import { container } from '#/container';
import { HTTP_CLIENT_OPTIONS } from '#/http';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter';
import { configureNodeHttpServer } from '#/http/server/node';
import { WebServerModule } from '#/module/modules';
import type { SchemaOutput } from '#/schema';
import { array, boolean, number, object, refine, string } from '#/schema';
import { timeout } from '#/utils';
import { Agent } from 'undici';

const userSchema = object({
  id: number(),
  name: string()
});

type User = SchemaOutput<typeof userSchema>;

const users: User[] = [
  { id: 1, name: 'Alice' },
  { id: 3, name: 'Bob' }
];

const userIdParameterSchema = refine(number({ coerce: true }), (value) => (users.some((user) => user.id == value) ? { valid: true } : { valid: false, error: 'user not found' }));

type UsersApiDefinition = typeof usersApiDefinition;

const usersApiDefinition = defineApi({
  resource: 'users', // /api/:version/users
  endpoints: {
    load() {
      return {
        method: 'GET',
        resource: ':id', // => /api/v1/users/:id
        version: 1,
        parameters: object({
          id: userIdParameterSchema
        }),
        result: userSchema
      };
    },
    loadAll() {
      return {
        method: 'GET',
        resource: rootResource, // => /api/v1/users
        result: array(userSchema)
      };
    },
    delete() {
      return {
        method: 'DELETE',
        resource: ':id', // => /api/v1/users/:id
        parameters: object({
          id: number({ coerce: true })
        }),
        result: boolean()
      };
    }
  }
});

@apiController(usersApiDefinition)
class UserApi implements ApiController<UsersApiDefinition> {
  load({ parameters }: ApiRequestData<UsersApiDefinition, 'load'>): ApiServerResult<UsersApiDefinition, 'load'> {
    return users.find((user) => user.id == parameters.id)!;
  }

  loadAll(this: UserApi): ApiServerResult<UsersApiDefinition, 'loadAll'> {
    return users;
  }

  delete({ parameters }: ApiRequestData<UsersApiDefinition, 'delete'>): ApiServerResult<UsersApiDefinition, 'delete'> {
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
  await timeout(250); // allow server to start

  const userApiClient = container.resolve(UserApiClient);

  const allUsers = await userApiClient.loadAll();
  console.log(allUsers);

  await userApiClient.delete({ id: allUsers[0]!.id });

  const allUsersAfterDelete = await userApiClient.loadAll();
  console.log(allUsersAfterDelete);
}

async function main(): Promise<void> {
  configureNodeHttpServer(true);
  configureApiModule({ controllers: [UserApi] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  container.register(HTTP_CLIENT_OPTIONS, { useValue: { baseUrl: 'http://localhost:8000' } });

  Application.registerModule(WebServerModule);
  await Application.run();
}

void main();
void clientTest().catch((error) => console.error(error)).then(async () => timeout(1000)).then(async () => Application.shutdown());
