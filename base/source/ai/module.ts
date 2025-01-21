import { Injector } from '#/injector/injector.js';
import { AiServiceOptions } from './ai.service.js';

export type ApiModuleOptions = AiServiceOptions;

export function configureAiService(options: ApiModuleOptions): void {
  Injector.register(AiServiceOptions, { useValue: options });
}
