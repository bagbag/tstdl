/* eslint-disable max-classes-per-file */
import '#/polyfills.js';

import { Agent } from 'undici';

import { compileClient } from '#/api/client/client.js';
import type { ApiController, ApiRequestContext, ApiServerResult } from '#/api/index.js';
import { defineApi } from '#/api/index.js';
import { apiController, configureApiServer } from '#/api/server/index.js';
import { Application } from '#/application/application.js';
import { CORE_LOGGER, configureTstdl, getGlobalInjector } from '#/core.js';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici.adapter.js';
import { configureHttpClient } from '#/http/client/module.js';
import { HttpServerResponse } from '#/http/server/index.js';
import { configureNodeHttpServer } from '#/http/server/node/index.js';
import { inject } from '#/injector/inject.js';
import { WebServerModule } from '#/module/modules/web-server.module.js';
import { configureDefaultSignalsImplementation } from '#/signals/implementation/configure.js';
import { ServerSentEvents, ServerSentEventsSource } from '#/sse/index.js';
import { decodeTextStream, encodeUtf8Stream } from '#/utils/encoding.js';
import { getReadableStreamFromIterable, getReadableStreamIterable } from '#/utils/stream/index.js';
import { cancelableTimeout, timeout } from '#/utils/timing.js';
import { isDefined } from '#/utils/type-guards.js';

configureTstdl();
configureDefaultSignalsImplementation();

const logger = getGlobalInjector().resolve(CORE_LOGGER);

type StreamingApiDefinition = typeof streamingApiDefinition;

const streamingApiDefinition = defineApi({
  resource: 'streams', // /api/:version/users
  endpoints: {
    echo: {
      method: 'POST',
      resource: 'echo',
      body: ReadableStream,
      result: ReadableStream,
    },
    events: {
      method: 'GET',
      resource: 'events',
      result: ServerSentEvents,
      cors: {
        accessControlAllowOrigin: '*',
        accessControlAllowMethods: 'GET',
      },
    },
  },
});

@apiController(streamingApiDefinition)
class StreamingApi implements ApiController<StreamingApiDefinition> {
  echo({ request, body }: ApiRequestContext<StreamingApiDefinition, 'echo'>): ApiServerResult<StreamingApiDefinition, 'echo'> {
    return HttpServerResponse.fromObject({
      headers: {
        'Content-Type': request.headers.contentType,
        'Content-Length': request.headers.contentLength,
      },
      body: {
        stream: body,
      },
    });
  }

  events(_data: ApiRequestContext<StreamingApiDefinition, 'events'>): ApiServerResult<StreamingApiDefinition, 'events'> {
    return eventsSource();
  }
}

async function* counter(): AsyncIterableIterator<string> {
  let currentNumber = 0;

  while (Application.shutdownSignal.isUnset && (currentNumber < 10)) {
    yield (`${++currentNumber}`).toString();
    logger.info(`yield: "${currentNumber}"`);
    await cancelableTimeout(1000, Application.shutdownSignal);
  }
}

const StreamingApiClient = compileClient(streamingApiDefinition);

async function clientTest(): Promise<void> {
  const streamingApiClient = inject(StreamingApiClient);

  await timeout(250); // allow server to start

  const response = await streamingApiClient.echo(undefined, getReadableStreamFromIterable(counter()).pipeThrough(encodeUtf8Stream()));

  for await (const responseChunk of getReadableStreamIterable(response.pipeThrough(decodeTextStream()))) {
    logger.info(`response: "${responseChunk}"\n`);
  }

  await Application.shutdown();
}

function bootstrap(): void {
  configureNodeHttpServer();
  configureApiServer({ controllers: [StreamingApi] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  configureHttpClient({ baseUrl: 'http://localhost:8000' });
}

Application.run({ bootstrap }, WebServerModule, clientTest);

function eventsSource(): ServerSentEventsSource {
  const events = new ServerSentEventsSource();

  void (async () => {
    for (let i = 1; i <= 10; i++) {
      if (events.closed() || isDefined(events.error())) {
        return;
      }

      await events.sendJson({ name: 'time', id: i.toString(), data: { dateTime: new Date().toLocaleString(), uptime: performance.now() }, retry: 1000 });
      await timeout(1000);
    }

    await events.close();
  })().catch((error) => console.error(error));

  return events;
}
