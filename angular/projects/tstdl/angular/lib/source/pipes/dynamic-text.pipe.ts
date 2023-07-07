import type { PipeTransform } from '@angular/core';
import { Pipe, inject, signal } from '@angular/core';
import { switchMap } from '@tstdl/base/signals';
import { LocalizationService, missingLocalizationKeyText, resolveDynamicText, type DynamicText } from '@tstdl/base/text';

@Pipe({
  name: 'dynamicText',
  pure: false,
  standalone: true
})
export class DynamicTextPipe implements PipeTransform {
  readonly #localizationService = inject(LocalizationService);

  readonly #text = signal<DynamicText | null>(null);
  readonly #result = switchMap(() => resolveDynamicText(this.#text() ?? missingLocalizationKeyText, this.#localizationService));

  transform(value: DynamicText | null | undefined): string | null {
    queueMicrotask(() => this.#text.set(value ?? null));
    return this.#result();
  }
}
