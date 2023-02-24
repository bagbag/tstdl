import { container } from '#/container/index.js';
import { HttpServer } from '../http-server.js';
import { NodeHttpServer } from './node-http-server.js';

/**
 * registers {@link HttpServer} in global container
 */
export function configureNodeHttpServer(): void {
  container.registerSingleton(HttpServer, { useToken: NodeHttpServer });
}
