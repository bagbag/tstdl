import { container } from '#/container';
import { HttpServer } from '../http-server';
import { NodeHttpServer } from './node-http-server';

/**
 * @param register whether to register for {@link HttpServer}
 */
export function configureNodeHttpServer(register: boolean = true): void {
  if (register) {
    container.register(HttpServer, { useToken: NodeHttpServer });
  }
}
