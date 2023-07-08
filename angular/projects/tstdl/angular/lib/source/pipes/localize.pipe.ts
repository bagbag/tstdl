import type { PipeTransform } from '@angular/core';
import { Pipe, computed, inject, signal, untracked } from '@angular/core';
import { switchMap } from '@tstdl/base/signals';
import type { LocalizationData, LocalizationKey } from '@tstdl/base/text';
import { LocalizationService, isProxyLocalizationKey } from '@tstdl/base/text';
import { isNotNull, isNull, isNullOrUndefined, isString, strictEquals } from '@tstdl/base/utils';

@Pipe({
  name: 'localize',
  pure: false,
  standalone: true
})
export class LocalizePipe implements PipeTransform {
  readonly #localizationService = inject(LocalizationService);

  readonly #transformKey = signal<LocalizationKey<any> | null>(null, { equal: strictEquals });
  readonly #transformParameters = signal<any>(undefined, { equal: strictEquals });
  readonly #transformData = signal<LocalizationData | null>(null, { equal: strictEquals });

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
      this.updateInputs(null, null);

      return null;
    }

    if (isString(localizationDataOrKey) || isProxyLocalizationKey(localizationDataOrKey)) {
      this.updateInputs(null, localizationDataOrKey, parametersOrNothing);
    }
    else {
      this.updateInputs(localizationDataOrKey, null);
    }

    return this.#result();
  }

  private updateInputs(data: LocalizationData | null, key: LocalizationKey<any> | null, parameters: any = undefined): void {
    untracked(() => {
      this.#transformData.set(data);
      this.#transformKey.set(key);
      this.#transformParameters.set(parameters);
    });
  }
}
