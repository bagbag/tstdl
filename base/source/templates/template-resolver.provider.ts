import { Inject, Singleton } from '#/injector/decorators.js';
import type { TemplateResolver } from './template.resolver.js';
import { TEMPLATE_RESOLVERS } from './tokens.js';

@Singleton()
export class TemplateResolverProvider {
  private readonly resolvers: Set<TemplateResolver>;

  constructor(@Inject(TEMPLATE_RESOLVERS) resolvers: TemplateResolver[]) {
    this.resolvers = new Set(resolvers);
  }

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
