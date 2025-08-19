import { inject, Singleton } from '#/injector/index.js';
import type { TemplateResolver } from './template.resolver.js';
import { TEMPLATE_RESOLVERS } from './tokens.js';

@Singleton()
export class TemplateResolverProvider {
  private readonly resolvers = new Set<TemplateResolver>(inject(TEMPLATE_RESOLVERS, undefined, { optional: true }) ?? []);

  register(renderer: TemplateResolver): void {
    this.resolvers.add(renderer);
  }

  has(type: string): boolean {
    for (const renderer of this.resolvers) {
      if (renderer.canHandle(type)) {
        return true;
      }
    }

    return false;
  }

  get(type: string): TemplateResolver {
    for (const renderer of this.resolvers) {
      if (renderer.canHandle(type)) {
        return renderer;
      }
    }

    throw new Error(`No resolver for ${type} registered.`);
  }
}
