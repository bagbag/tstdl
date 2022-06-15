import { singleton } from '#/container';
import { TemplateService } from '#/templates';
import * as puppeteer from 'puppeteer';

@singleton()
export class PdfService {
  private readonly templateService: TemplateService;

  constructor(templateService: TemplateService) {
    this.templateService = templateService;
  }

  async renderHtml(html: string): Promise<Uint8Array> {
    return this.render(async (page) => page.setContent(html, { waitUntil: 'networkidle2' }));
  }

  async renderTemplate(key: string, templateContext: object): Promise<Uint8Array> {
    const html = await this.templateService.render(key, templateContext);
    return this.renderHtml(html);
  }

  async renderUrl(url: string): Promise<Uint8Array> {
    return this.render(async (page) => page.goto(url, { waitUntil: 'networkidle2' }));
  }

  private async render(handler: (page: puppeteer.Page) => unknown): Promise<Uint8Array> {
    const browser = await puppeteer.launch();

    try {
      const page = await browser.newPage();
      await handler(page);
      const result = await page.pdf({ format: 'a4' });
      return result;
    }
    finally {
      await browser.close();
    }
  }
}
