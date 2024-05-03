import type { PipeTransform, SecurityContext } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SafeValue } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'sanitize',
  standalone: true
})
export class SanitizePipe implements PipeTransform {
  private readonly domSanitizer: DomSanitizer;

  constructor(domSanitizer: DomSanitizer) {
    this.domSanitizer = domSanitizer;
  }

  transform(url: string | SafeValue | null | undefined, context: SecurityContext): string | null {
    return this.domSanitizer.sanitize(context, url ?? null);
  }
}
