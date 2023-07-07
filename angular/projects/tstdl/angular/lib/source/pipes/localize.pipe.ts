import type { PipeTransform } from '@angular/core';
import { Pipe, computed, inject, signal } from '@angular/core';
import { switchMap } from '@tstdl/base/signals';
import type { LocalizationData, LocalizationKey } from '@tstdl/base/text';
import { LocalizationService, isProxyLocalizationKey } from '@tstdl/base/text';
import { isNotNull, isNull, isNullOrUndefined, isString } from '@tstdl/base/utils';

@Pipe({
  name: 'localize',
  pure: false,
  standalone: true
})
export class LocalizePipe implements PipeTransform {
  readonly #localizationService = inject(LocalizationService);

  readonly #transformData = signal<LocalizationData | null>(null);
  readonly #transformKey = signal<LocalizationKey<any> | null>(null);
  readonly #transformParameters = signal<any>(undefined);

  readonly #result = switchMap(() => {
    const data = this.#transformData();

    if (isNotNull(data)) {
      return this.#localizationService.localize(data);
    }

    const key = this.#transformKey();

    if (isNull(key)) {
      return computed(() => '[MISSING LOCALIZATION KEY]');
    }

    return this.#localizationService.localize({ key, parameters: this.#transformParameters() });
  });

  transform(localizationKey: LocalizationKey | null | undefined): string | null;
  transform<Parameters>(localizationData: LocalizationData<Parameters> | null | undefined): string | null;
  transform<Parameters>(localizationKey: LocalizationKey<Parameters> | null | undefined, parameters: Parameters): string | null;
  transform<Parameters>(localizationDataOrKey: LocalizationData<Parameters> | null | undefined, parametersOrNothing?: Parameters): string | null {
    if (isNullOrUndefined(localizationDataOrKey)) {
      this.#transformKey.set(null);
      this.#transformParameters.set(undefined);
      this.#transformData.set(null);

      return null;
    }

    if (isString(localizationDataOrKey) || isProxyLocalizationKey(localizationDataOrKey)) {
      this.#transformKey.set(localizationDataOrKey);
      this.#transformParameters.set(parametersOrNothing);
      this.#transformData.set(null);
    }
    else {
      this.#transformKey.set(null);
      this.#transformParameters.set(undefined);
      this.#transformData.set(localizationDataOrKey);
    }

    return this.#result();
  }
}
