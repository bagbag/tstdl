import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import type { LocalizationData, LocalizationKey } from '@tstdl/base/text';
import { isProxyLocalizationKey, LocalizationService } from '@tstdl/base/text';
import { isNull } from '@tstdl/base/utils';
import { distinctUntilChanged, Subject, switchMap, takeUntil } from 'rxjs';

@Pipe({
  name: 'localize',
  pure: false,
  standalone: true
})
export class LocalizePipe implements PipeTransform, OnDestroy {
  private readonly transformSubject: Subject<LocalizationData>;
  private readonly destroySubject: Subject<void>;

  private value: string | null;

  constructor(changeDetectorRef: ChangeDetectorRef, localizationService: LocalizationService) {
    this.destroySubject = new Subject();
    this.transformSubject = new Subject();

    this.value = null;

    this.transformSubject
      .pipe(
        switchMap((data) => localizationService.localize$(data)),
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

  transform(localizationKey: LocalizationKey | null): string | null;
  transform<Parameters>(localizationData: LocalizationData<Parameters> | null): string | null;
  transform<Parameters>(localizationKey: LocalizationKey<Parameters> | null, parameters: Parameters): string | null;
  transform<Parameters>(localizationDataOrKey: LocalizationData<Parameters> | null, parametersOrNothing?: Parameters): string | null {
    if (isNull(localizationDataOrKey)) {
      return null;
    }

    if (isProxyLocalizationKey(localizationDataOrKey)) {
      this.transformSubject.next({ key: localizationDataOrKey, parameters: parametersOrNothing });
    }
    else {
      this.transformSubject.next(localizationDataOrKey);
    }

    return this.value;
  }
}
