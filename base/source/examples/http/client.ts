import '#/polyfills.js';

import { Application } from '#/application/application.js';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici.adapter.js';
import { HttpClient } from '#/http/client/index.js';
import { inject } from '#/injector/inject.js';

configureUndiciHttpClientAdapter();

async function main(): Promise<void> {
  const httpClient = inject(HttpClient);

  const response = await httpClient.get('https://httpbin.org/anything/:whatever', {
    parameters: {
      whatever: 'foobar',
      anotherParameter: 'hello-world'
    }
  });

  const body = await response.body.readAsJson();

  console.log(response.asObject(), body);
}

Application.run(main);
