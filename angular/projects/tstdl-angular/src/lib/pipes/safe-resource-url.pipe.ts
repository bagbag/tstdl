import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SafeResourceUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { isNull } from '@tstdl/base/utils';

@Pipe({
  name: 'safeResourceUrl',
  standalone: true
})
export class SafeResourceUrlPipe implements PipeTransform {
  private readonly domSanitizer: DomSanitizer;

  constructor(domSanitizer: DomSanitizer) {
    this.domSanitizer = domSanitizer;
  }

  transform(url: string | null): SafeResourceUrl | null {
    if (isNull(url)) {
      return null;
    }

    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
