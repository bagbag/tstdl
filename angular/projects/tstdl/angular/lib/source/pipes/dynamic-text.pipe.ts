import type { PipeTransform } from '@angular/core';
import { Injector, Pipe, computed, inject, runInInjectionContext, signal, untracked } from '@angular/core';
import { switchMap } from '@tstdl/base/signals';
import { LocalizationService, missingLocalizationKeyText, resolveDynamicText, type DynamicText } from '@tstdl/base/text';
import { isNull } from '@tstdl/base/utils';
import { strictEquals } from '@tstdl/base/utils/equals';

@Pipe({
  name: 'dynamicText',
  pure: false,
  standalone: true
})
export class DynamicTextPipe implements PipeTransform {
  readonly #injector = inject(Injector);
  readonly #localizationService = inject(LocalizationService);

  readonly #text = signal<DynamicText | null | undefined>(undefined, { equal: strictEquals });
  readonly #result = switchMap(() => {
    const text = this.#text();
    return isNull(text)
      ? computed(() => null)
      : runInInjectionContext(this.#injector, () => resolveDynamicText(text ?? missingLocalizationKeyText, this.#localizationService));
  });

  transform(value: DynamicText | null | undefined): string | null {
    untracked(() => this.#text.set(value));
    return this.#result();
  }
}
