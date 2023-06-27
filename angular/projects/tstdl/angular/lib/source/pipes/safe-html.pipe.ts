import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { isNullOrUndefined } from '@tstdl/base/utils';

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  private readonly domSanitizer: DomSanitizer;

  constructor(domSanitizer: DomSanitizer) {
    this.domSanitizer = domSanitizer;
  }

  transform(html: string | null | undefined): SafeHtml | null {
    if (isNullOrUndefined(html)) {
      return null;
    }

    return this.domSanitizer.bypassSecurityTrustHtml(html);
  }
}
