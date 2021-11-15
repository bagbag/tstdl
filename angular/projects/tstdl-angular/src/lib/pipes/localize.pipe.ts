import { AsyncPipe } from '@angular/common';
import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import type { Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { LocalizationData } from '../services';
import { LocalizationService } from '../services';

@Pipe({
  name: 'localize',
  pure: false
})
export class LocalizePipe implements PipeTransform, OnDestroy {
  private readonly asyncPipe: AsyncPipe;
  private readonly localizationService: LocalizationService;
  private readonly transform$: ReplaySubject<LocalizationData>;
  private readonly localized$: Observable<string>;

  constructor(changeDetectorRef: ChangeDetectorRef, localizationService: LocalizationService) {
    this.asyncPipe = new AsyncPipe(changeDetectorRef);
    this.localizationService = localizationService;

    this.transform$ = new ReplaySubject(1);
    this.localized$ = this.transform$.pipe(switchMap((data) => this.localizationService.localize$(data)));
  }

  ngOnDestroy(): void {
    this.asyncPipe.ngOnDestroy();
    this.transform$.complete();
  }

  transform<Parameters>(localizationData: LocalizationData<Parameters>): string | null {
    this.transform$.next(localizationData);
    return this.asyncPipe.transform(this.localized$);
  }
}
