import type { PipeTransform } from '@angular/core';
import { Pipe, computed, inject, signal } from '@angular/core';
import { switchMap } from '@tstdl/base/signals';
import { LocalizationService } from '@tstdl/base/text';
import type { Enumeration, EnumerationValue } from '@tstdl/base/types';
import { isNotNull, isNullOrUndefined, isObject } from '@tstdl/base/utils';

@Pipe({
  name: 'localizeEnum',
  pure: false,
  standalone: true
})
export class LocalizeEnumPipe implements PipeTransform {
  readonly #localizationService = inject(LocalizationService);

  readonly #enumeration = signal<Enumeration | null>(null);
  readonly #value = signal<EnumerationValue | undefined>(undefined);
  readonly #parameters = signal<any>(undefined);

  readonly #result = switchMap(() => {
    const enumeration = this.#enumeration();

    if (isNotNull(enumeration)) {
      return this.#localizationService.localizeEnum(enumeration, this.#value(), this.#parameters());
    }

    return computed(() => '[MISSING LOCALIZATION KEY]');
  });

  transform<T extends Enumeration>(enumeration: T, parameters?: unknown): string | null;
  transform<T extends Enumeration>(value: EnumerationValue<T> | null | undefined, enumeration: T, parameters?: unknown): string | null;
  transform<T extends Enumeration>(enumerationOrValue: T | EnumerationValue<T> | null | undefined, enumerationOrParameters: T | unknown, parametersOrNothing?: unknown): string | null {
    if (isNullOrUndefined(enumerationOrValue)) {
      this.setNoInput();
      return null;
    }

    if (isObject(enumerationOrValue)) {
      this.#enumeration.set(enumerationOrValue);
      this.#value.set(undefined);
      this.#parameters.set(enumerationOrParameters);
    }
    else {
      if (isNullOrUndefined(enumerationOrParameters)) {
        this.setNoInput();
        return null;
      }

      this.#enumeration.set(enumerationOrParameters as T);
      this.#value.set(enumerationOrValue);
      this.#parameters.set(parametersOrNothing);
    }

    return this.#result();
  }

  private setNoInput(): void {
    this.#enumeration.set(null);
    this.#value.set(undefined);
    this.#parameters.set(undefined);
  }
}
