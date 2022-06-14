import { singleton } from '#/container';
import type { TemplateRenderer } from './template.renderer';
import { TEMPLATE_RENDERERS } from './tokens';

@singleton({
  provider: {
    useFactory: (_, context) => {
      if (context.isAsync) {
        return (async () => {
          const types = await context.resolveAsync(TEMPLATE_RENDERERS);
          const renderers = await Promise.all(types.map(async (type) => context.resolveAsync(type)));
          return new TemplateRendererProvider(renderers);
        })();
      }

      const types = context.resolve(TEMPLATE_RENDERERS);
      const renderers = types.map((type) => context.resolve(type));
      return new TemplateRendererProvider(renderers);
    }
  }
})
export class TemplateRendererProvider {
  private readonly renderers: Set<TemplateRenderer>;

  constructor(renderers: TemplateRenderer[]) {
    this.renderers = new Set(renderers);
  }

  register(renderer: TemplateRenderer): void {
    this.renderers.add(renderer);
  }

  has(type: string): boolean {
    for (const renderer of this.renderers) {
      if (renderer.canHandleType(type)) {
        return true;
      }
    }

    return false;
  }

  get(type: string): TemplateRenderer {
    for (const renderer of this.renderers) {
      if (renderer.canHandleType(type)) {
        return renderer;
      }
    }

    throw new Error(`No renderer for ${type} registered.`);
  }
}
