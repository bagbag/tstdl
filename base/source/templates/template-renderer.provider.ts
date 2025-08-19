import { inject, Singleton } from '#/injector/index.js';
import type { TemplateRenderer } from './template.renderer.js';
import { TEMPLATE_RENDERERS } from './tokens.js';

@Singleton()
export class TemplateRendererProvider {
  private readonly renderers = new Set<TemplateRenderer>(inject(TEMPLATE_RENDERERS, undefined, { optional: true }) ?? []);

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
