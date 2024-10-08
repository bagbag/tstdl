import { Injector, Pipe, type PipeTransform, computed, inject, runInInjectionContext, signal, untracked } from '@angular/core';
import { switchAll } from '@tstdl/base/signals';
import { type DynamicText, LocalizationService, missingLocalizationKeyText, resolveDynamicText } from '@tstdl/base/text';
import { isNull, strictEquals } from '@tstdl/base/utils';

@Pipe({
  name: 'dynamicText',
  pure: false,
  standalone: true
})
export class DynamicTextPipe implements PipeTransform {
  readonly #injector = inject(Injector);
  readonly #localizationService = inject(LocalizationService);

  readonly #text = signal<DynamicText | null | undefined>(undefined, { equal: strictEquals });
  readonly #result = switchAll(() => {
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
