import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import { distinctUntilChanged, Subject, switchMap, takeUntil } from 'rxjs';
import type { LocalizationData, LocalizationKey } from '../services';
import { isLocalizationKey, LocalizationService } from '../services';

@Pipe({
  name: 'localize',
  pure: false
})
export class LocalizePipe implements PipeTransform, OnDestroy {
  private readonly transformSubject: Subject<LocalizationData>;
  private readonly destroySubject: Subject<void>;

  private value: string;

  constructor(changeDetectorRef: ChangeDetectorRef, localizationService: LocalizationService) {
    this.destroySubject = new Subject();
    this.transformSubject = new Subject();

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

  transform(localizationKey: LocalizationKey<void>): string;
  transform<Parameters>(localizationData: LocalizationData<Parameters>): string;
  transform<Parameters>(localizationKey: LocalizationKey<Parameters>, parameters: Parameters): string;
  transform<Parameters>(localizationDataOrKey: LocalizationData<Parameters>, parametersOrNothing?: Parameters): string | null {
    if (isLocalizationKey(localizationDataOrKey)) {
      this.transformSubject.next({ key: localizationDataOrKey, parameters: parametersOrNothing });
    }
    else {
      this.transformSubject.next(localizationDataOrKey);
    }

    return this.value;
  }
}
