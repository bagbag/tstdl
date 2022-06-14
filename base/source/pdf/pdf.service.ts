import { singleton } from '#/container';
import { TemplateService } from '#/templates';
import * as puppeteer from 'puppeteer';

@singleton()
export class PdfService {
  private readonly templateService: TemplateService;

  constructor(templateService: TemplateService) {
    this.templateService = templateService;
  }

  async render(html: string): Promise<Uint8Array> {
    const browser = await puppeteer.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle2' });
      const result = await page.pdf({ format: 'a4' });
      return result;
    }
    finally {
      await browser.close();
    }
  }

  async renderTemplate(key: string, templateContext: object): Promise<Uint8Array> {
    const html = await this.templateService.render(key, templateContext);
    return this.render(html);
  }
}
