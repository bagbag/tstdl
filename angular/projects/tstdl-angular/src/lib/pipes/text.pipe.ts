import { AsyncPipe } from '@angular/common';
import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import { isNullOrUndefined } from '@tstdl/base/utils/type-guards';
import { isObservable } from 'rxjs';
import type { Text } from '../models';
import { LocalizationService } from '../services';
import { OptionalLocalizePipe } from './optional-localize.pipe';

@Pipe({
  name: 'text',
  pure: false
})
export class TextPipe implements PipeTransform, OnDestroy {
  private readonly asyncPipe: AsyncPipe;
  private readonly optionalLocalizePipe: OptionalLocalizePipe;

  constructor(changeDetector: ChangeDetectorRef, localizationService: LocalizationService) {
    this.asyncPipe = new AsyncPipe(changeDetector);
    this.optionalLocalizePipe = new OptionalLocalizePipe(changeDetector, localizationService);
  }

  ngOnDestroy(): void {
    this.asyncPipe.ngOnDestroy();
    this.optionalLocalizePipe.ngOnDestroy();
  }

  transform(value: Text | null | undefined): string | null {
    if (isNullOrUndefined(value)) {
      return null;
    }

    return isObservable(value) ? this.optionalLocalizePipe.transform(this.asyncPipe.transform(value)) : this.optionalLocalizePipe.transform(value);
  }
}
