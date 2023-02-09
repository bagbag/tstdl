import { container } from '#/container';
import { HttpServer } from '../http-server';
import { NodeHttpServer } from './node-http-server';

/**
 * registers {@link HttpServer} in global container
 */
export function configureNodeHttpServer(): void {
  container.registerSingleton(HttpServer, { useToken: NodeHttpServer });
}
