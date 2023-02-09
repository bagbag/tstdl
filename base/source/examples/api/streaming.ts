/* eslint-disable max-classes-per-file */
import type { ApiController, ApiRequestData, ApiServerResult } from '#/api';
import { defineApi } from '#/api';
import { compileClient } from '#/api/client';
import { apiController, configureApiServer } from '#/api/server';
import { Application } from '#/application';
import { container } from '#/container';
import { CORE_LOGGER } from '#/core';
import { HTTP_CLIENT_OPTIONS } from '#/http';
import { configureUndiciHttpClientAdapter } from '#/http/client/adapters/undici-http-client.adapter';
import { HttpServerResponse } from '#/http/server';
import { configureNodeHttpServer } from '#/http/server/node';
import { WebServerModule } from '#/module/modules';
import { SeverSentEvents } from '#/sse';
import { decodeTextStream, encodeUtf8Stream } from '#/utils/encoding';
import { getReadableStreamFromIterable, getReadableStreamIterable } from '#/utils/stream';
import { cancelableTimeout, timeout } from '#/utils/timing';
import { isDefined } from '#/utils/type-guards';
import { Agent } from 'undici';

const logger = container.resolve(CORE_LOGGER);

type StreamingApiDefinition = typeof streamingApiDefinition;

const streamingApiDefinition = defineApi({
  resource: 'streams', // /api/:version/users
  endpoints: {
    echo: {
      method: 'POST',
      resource: 'echo',
      body: ReadableStream,
      result: ReadableStream
    },
    events: {
      method: 'GET',
      resource: 'events',
      result: ReadableStream,
      cors: {
        accessControlAllowOrigin: '*',
        accessControlAllowMethods: 'GET'
      }
    }
  }
});

@apiController(streamingApiDefinition)
class StreamingApi implements ApiController<StreamingApiDefinition> {
  echo({ request, body }: ApiRequestData<StreamingApiDefinition, 'echo'>): ApiServerResult<StreamingApiDefinition, 'echo'> {
    return HttpServerResponse.fromObject({
      headers: {
        'Content-Type': request.headers.contentType,
        'Content-Length': request.headers.contentLength
      },
      body: {
        stream: body
      }
    });
  }

  events(_data: ApiRequestData<StreamingApiDefinition, 'events'>): ApiServerResult<StreamingApiDefinition, 'events'> {
    return HttpServerResponse.fromObject({
      body: {
        events: eventsSource()
      }
    });
  }
}

async function* counter(): AsyncIterableIterator<string> {
  let currentNumber = 0;

  while (Application.shutdownToken.isUnset && (currentNumber < 15)) {
    yield (`${++currentNumber}`).toString();
    logger.info(`yield: "${currentNumber}"`);
    await cancelableTimeout(1000, Application.shutdownToken);
  }
}

const StreamingApiClient = compileClient(streamingApiDefinition);

async function clientTest(): Promise<void> {
  await timeout(250); // allow server to start

  const streamingApiClient = container.resolve(StreamingApiClient);

  const response = await streamingApiClient.echo(undefined, getReadableStreamFromIterable(counter()).pipeThrough(encodeUtf8Stream()));

  for await (const responseChunk of getReadableStreamIterable(response.pipeThrough(decodeTextStream()))) {
    logger.info(`response: "${responseChunk}"\n`);
  }

  // await Application.shutdown();
}

function main(): void {
  configureNodeHttpServer();
  configureApiServer({ controllers: [StreamingApi] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  container.register(HTTP_CLIENT_OPTIONS, { useValue: { baseUrl: 'http://localhost:8000' } });

  Application.run(WebServerModule);
}

main();
void clientTest().catch((error) => logger.error(error as Error));


function eventsSource(): SeverSentEvents {
  const events = new SeverSentEvents();

  void (async () => {
    for (let i = 1; i <= 10; i++) {
      if (events.closed || isDefined(events.error)) {
        return;
      }

      await events.sendJson({ name: 'time', id: i.toString(), data: { dateTime: `${new Date().toLocaleString()}`, uptime: performance.now() }, retry: 1000 });
      await timeout(1000);
    }

    await events.close();
  })().catch((error) => console.error(error));

  return events;
}
