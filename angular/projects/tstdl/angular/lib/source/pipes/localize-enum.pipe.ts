import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import { LocalizationService } from '@tstdl/base/text';
import type { Enumeration, EnumerationValue } from '@tstdl/base/types';
import { isNullOrUndefined, isObject } from '@tstdl/base/utils';
import { Subject, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';

type EnumLocalizationData = {
  enumeration: Enumeration,
  value?: EnumerationValue,
  parameters: unknown
};

@Pipe({
  name: 'localizeEnum',
  pure: false,
  standalone: true
})
export class LocalizeEnumPipe implements PipeTransform, OnDestroy {
  private readonly transformSubject: Subject<EnumLocalizationData>;
  private readonly destroySubject: Subject<void>;

  private text: string | null;

  constructor(changeDetectorRef: ChangeDetectorRef, localizationService: LocalizationService) {
    this.destroySubject = new Subject();
    this.transformSubject = new Subject();

    this.text = null;

    this.transformSubject
      .pipe(
        switchMap((data) => localizationService.localizeEnum$(data.enumeration, data.value, data.parameters)),
        distinctUntilChanged(),
        takeUntil(this.destroySubject)
      )
      .subscribe((text) => {
        this.text = text;
        changeDetectorRef.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
    this.transformSubject.complete();
  }

  transform<T extends Enumeration>(enumeration: T, parameters?: unknown): string | null;
  transform<T extends Enumeration>(value: EnumerationValue<T> | null, enumeration: T, parameters?: unknown): string | null;
  transform<T extends Enumeration>(enumerationOrValue: T | EnumerationValue<T> | null, enumerationOrParameters: T | unknown, parametersOrNothing?: unknown): string | null {
    if (isNullOrUndefined(enumerationOrValue)) {
      return null;
    }

    if (isObject(enumerationOrValue)) {
      this.transformSubject.next({ enumeration: enumerationOrValue, parameters: enumerationOrParameters });
    }
    else {
      if (isNullOrUndefined(enumerationOrParameters)) {
        return null;
      }

      this.transformSubject.next({ enumeration: enumerationOrParameters as T, value: enumerationOrValue, parameters: parametersOrNothing });
    }

    return this.text;
  }
}
