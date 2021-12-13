import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SafeUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'safeUrl'
})
export class SafeUrlPipe implements PipeTransform {
  private readonly domSanitizer: DomSanitizer;

  constructor(domSanitizer: DomSanitizer) {
    this.domSanitizer = domSanitizer;
  }

  transform(url: string): SafeUrl {
    return this.domSanitizer.bypassSecurityTrustUrl(url);
  }
}
