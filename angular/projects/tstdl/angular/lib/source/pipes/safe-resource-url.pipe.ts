import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SafeResourceUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { isNullOrUndefined } from '@tstdl/base/utils';

@Pipe({
  name: 'safeResourceUrl',
  standalone: true
})
export class SafeResourceUrlPipe implements PipeTransform {
  private readonly domSanitizer: DomSanitizer;

  constructor(domSanitizer: DomSanitizer) {
    this.domSanitizer = domSanitizer;
  }

  transform(url: string | null | undefined): SafeResourceUrl | null {
    if (isNullOrUndefined(url)) {
      return null;
    }

    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
