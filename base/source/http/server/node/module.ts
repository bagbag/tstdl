import { Injector } from '#/injector/injector.js';
import { HttpServer } from '../http-server.js';
import { NodeHttpServer } from './node-http-server.js';

export class NodeHttpServerConfiguration {
  trustedProxiesCount: number;
};

/**
 * registers {@link HttpServer} in global container
 */
export function configureNodeHttpServer(configuration: Partial<NodeHttpServerConfiguration> = {}): void {
  Injector.register(NodeHttpServerConfiguration, {
    useValue: {
      trustedProxiesCount: configuration.trustedProxiesCount ?? 0,
    },
  });

  Injector.registerSingleton(HttpServer, { useToken: NodeHttpServer });
}
