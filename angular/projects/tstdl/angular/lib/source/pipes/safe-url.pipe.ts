import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SafeUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { isNullOrUndefined } from '@tstdl/base/utils';

@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  private readonly domSanitizer: DomSanitizer;

  constructor(domSanitizer: DomSanitizer) {
    this.domSanitizer = domSanitizer;
  }

  transform(url: string | null | undefined): SafeUrl | null {
    if (isNullOrUndefined(url)) {
      return null;
    }

    return this.domSanitizer.bypassSecurityTrustUrl(url);
  }
}
