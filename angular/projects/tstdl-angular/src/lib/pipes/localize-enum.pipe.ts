import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import { LocalizationService } from '@tstdl/base/text';
import type { Enumeration, EnumerationValue } from '@tstdl/base/types';
import { isNull } from '@tstdl/base/utils';
import { distinctUntilChanged, Subject, switchMap, takeUntil } from 'rxjs';

type EnumLocalizationData = {
  enumeration: Enumeration,
  value: EnumerationValue,
  parameters: unknown
};

@Pipe({
  name: 'localizeEnum',
  pure: false
})
export class LocalizeEnumPipe implements PipeTransform, OnDestroy {
  private readonly transformSubject: Subject<EnumLocalizationData>;
  private readonly destroySubject: Subject<void>;

  private value: string;

  constructor(changeDetectorRef: ChangeDetectorRef, localizationService: LocalizationService) {
    this.destroySubject = new Subject();
    this.transformSubject = new Subject();

    this.transformSubject
      .pipe(
        switchMap((data) => localizationService.localizeEnum$(data.enumeration, data.value, data.parameters)),
        distinctUntilChanged(),
        takeUntil(this.destroySubject)
      )
      .subscribe((value) => {
        this.value = value;
        changeDetectorRef.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
    this.transformSubject.complete();
  }

  transform<T extends Enumeration>(enumeration: T, value: EnumerationValue<T>, parameters?: unknown): string | null;
  transform<T extends Enumeration>(enumeration: T | null, value: EnumerationValue<T> | null, parameters?: unknown): string | null;
  transform<T extends Enumeration>(enumeration: T | null, value: EnumerationValue<T> | null, parameters?: unknown): string | null {
    if (isNull(enumeration) || isNull(value)) {
      return null;
    }

    this.transformSubject.next({ enumeration, value, parameters });

    return this.value;
  }
}
