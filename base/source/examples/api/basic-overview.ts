/* eslint-disable max-classes-per-file */
import { defineApi, rootResource } from '#/api';
import { compileClient } from '#/api/client';
import { apiController, implementApi, registerApiControllers } from '#/api/server';
import { Application } from '#/application';
import { container } from '#/container';
import { HTTP_CLIENT_OPTIONS } from '#/http';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter';
import { configureNodeHttpServer } from '#/http/server/node';
import { WebServerModule } from '#/module/modules';
import type { SchemaOutput } from '#/schema';
import { array, boolean, number, object, refine, string } from '#/schema';
import { timeout } from '#/utils';

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

const usersApiDefinition = defineApi({
  resource: 'users', // /api/:version/users
  endpoints: {
    load: {
      method: 'GET',
      resource: ':id', // => /api/v1/users/:id
      version: 1,
      parameters: object({
        id: userIdParameterSchema
      }),
      result: userSchema
    },
    loadAll: {
      method: 'GET',
      resource: rootResource, // => /api/v1/users
      result: array(userSchema)
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

const foo = implementApi(usersApiDefinition, {
  load({ parameters: { id } }) {
    return users.find((user) => user.id == id)!;
  },

  loadAll(this: UserApi) {
    return users;
  },

  delete({ parameters: { id } }) {
    const index = users.findIndex((user) => user.id == id);

    if (index == -1) {
      return false;
    }

    users.splice(index, 1);
    return true;
  }
});

@apiController(usersApiDefinition)
class UserApi extends foo { }

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
  registerApiControllers(UserApi);
  configureUndiciHttpClientAdapter(true);
  container.register(HTTP_CLIENT_OPTIONS, { useValue: { baseUrl: 'http://localhost:8000' } });

  Application.registerModule(WebServerModule);
  await Application.run();
}

void main();
void clientTest().catch((error) => console.error(error));
