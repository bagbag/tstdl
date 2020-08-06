import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
