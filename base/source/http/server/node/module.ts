import { Injector } from '#/injector/injector.js';
import { HttpServer } from '../http-server.js';
import { NodeHttpServer } from './node-http-server.js';

/**
 * registers {@link HttpServer} in global container
 */
export function configureNodeHttpServer(): void {
  Injector.registerSingleton(HttpServer, { useToken: NodeHttpServer });
}
