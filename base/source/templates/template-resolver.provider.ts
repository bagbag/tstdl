import { inject, singleton } from '#/container';
import type { TemplateResolver } from './template.resolver';
import { TEMPLATE_RESOLVERS } from './tokens';

@singleton()
export class TemplateResolverProvider {
  private readonly resolvers: Set<TemplateResolver>;

  constructor(@inject(TEMPLATE_RESOLVERS) resolvers: TemplateResolver[]) {
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
