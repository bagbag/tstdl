import { container } from '#/container';
import { HttpClient } from '#/http';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter';

configureUndiciHttpClientAdapter();

async function main(): Promise<void> {
  const httpClient = container.resolve(HttpClient);

  const response = await httpClient.get('https://httpbin.org/anything/:whatever', {
    parameters: {
      whatever: 'foobar',
      anotherParameter: 'hello-world'
    }
  });

  console.log(response.asObject());
}

void main();
