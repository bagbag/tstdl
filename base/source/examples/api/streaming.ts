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
import { cancelableTimeout, decodeTextStream, encodeUtf8Stream, timeout } from '#/utils';
import { getReadableStreamFromIterable, getReadableStreamIterable } from '#/utils/stream';
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

  await Application.shutdown();
}

async function main(): Promise<void> {
  configureNodeHttpServer(true);
  configureApiServer({ controllers: [StreamingApi] });
  configureUndiciHttpClientAdapter({ dispatcher: new Agent({ keepAliveMaxTimeout: 1 }) });
  container.register(HTTP_CLIENT_OPTIONS, { useValue: { baseUrl: 'http://localhost:8000' } });

  Application.registerModule(WebServerModule);
  await Application.run();
}

void main();
void clientTest().catch((error) => logger.error(error as Error));
