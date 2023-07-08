import type { PipeTransform } from '@angular/core';
import { Injector, Pipe, inject, runInInjectionContext, signal, untracked } from '@angular/core';
import { switchMap } from '@tstdl/base/signals';
import { LocalizationService, missingLocalizationKeyText, resolveDynamicText, type DynamicText } from '@tstdl/base/text';
import { strictEquals } from '@tstdl/base/utils/equals';

@Pipe({
  name: 'dynamicText',
  pure: false,
  standalone: true
})
export class DynamicTextPipe implements PipeTransform {
  readonly #injector = inject(Injector);
  readonly #localizationService = inject(LocalizationService);

  readonly #text = signal<DynamicText | null>(null, { equal: strictEquals });
  readonly #result = switchMap(() => runInInjectionContext(this.#injector, () => resolveDynamicText(this.#text() ?? missingLocalizationKeyText, this.#localizationService)));

  transform(value: DynamicText | null | undefined): string | null {
    untracked(() => this.#text.set(value ?? null));
    return this.#result();
  }
}
