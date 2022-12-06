import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SafeUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { isNull } from '@tstdl/base/utils';

@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  private readonly domSanitizer: DomSanitizer;

  constructor(domSanitizer: DomSanitizer) {
    this.domSanitizer = domSanitizer;
  }

  transform(url: string | null): SafeUrl | null {
    if (isNull(url)) {
      return null;
    }

    return this.domSanitizer.bypassSecurityTrustUrl(url);
  }
}
