import { AsyncPipe } from '@angular/common';
import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import type { Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LocalizationService } from '../services';

@Pipe({
  name: 'localize',
  pure: false
})
export class LocalizePipe implements PipeTransform, OnDestroy {
  private readonly asyncPipe: AsyncPipe;
  private readonly localizationService: LocalizationService;
  private readonly transform$: ReplaySubject<{ key: string, parameter: any }>;
  private readonly localized$: Observable<string>;

  constructor(changeDetectorRef: ChangeDetectorRef, localizationService: LocalizationService) {
    this.asyncPipe = new AsyncPipe(changeDetectorRef);
    this.localizationService = localizationService;

    this.transform$ = new ReplaySubject(1);
    this.localized$ = this.transform$.pipe(switchMap(({ key, parameter }) => this.localizationService.localize$(key, parameter)));
  }

  ngOnDestroy(): void {
    this.asyncPipe.ngOnDestroy();
    this.transform$.complete();
  }

  transform(key: string, parameter?: any): any {
    this.transform$.next({ key, parameter });
    return this.asyncPipe.transform(this.localized$);
  }
}
