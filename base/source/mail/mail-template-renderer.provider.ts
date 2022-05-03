import { singleton } from '#/container';
import type { MailTemplateRenderer } from './mail-template.renderer';
import { MAIL_TEMPLATE_RENDERERS } from './tokens';

@singleton({
  provider: {
    useFactory: (_, context) => {
      if (context.isAsync) {
        return (async () => {
          const types = await context.resolveAsync(MAIL_TEMPLATE_RENDERERS);
          const renderers = await Promise.all(types.map(async (type) => context.resolveAsync(type)));
          return new MailTemplateRendererProvider(renderers);
        })();
      }

      const types = context.resolve(MAIL_TEMPLATE_RENDERERS);
      const renderers = types.map((type) => context.resolve(type));
      return new MailTemplateRendererProvider(renderers);
    }
  }
})
export class MailTemplateRendererProvider {
  private readonly renderers: Set<MailTemplateRenderer>;

  constructor(renderers: MailTemplateRenderer[]) {
    this.renderers = new Set(renderers);
  }

  register(renderer: MailTemplateRenderer): void {
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

  get(type: string): MailTemplateRenderer {
    for (const renderer of this.renderers) {
      if (renderer.canHandleType(type)) {
        return renderer;
      }
    }

    throw new Error(`No renderer for ${type} registered`);
  }
}
