import { AsyncPipe } from '@angular/common';
import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe, isSignal } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';
import { LocalizationService } from '@tstdl/base/text';
import { isNullOrUndefined } from '@tstdl/base/utils/type-guards';
import { isObservable } from 'rxjs';
import { OptionalLocalizePipe } from './optional-localize.pipe';

@Pipe({
  name: 'dynamicText',
  pure: false,
  standalone: true
})
export class DynamicTextPipe implements PipeTransform, OnDestroy {
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

  transform(value: DynamicText | null | undefined): string | null {
    if (isNullOrUndefined(value)) {
      return null;
    }

    if (isObservable(value)) {
      return this.optionalLocalizePipe.transform(this.asyncPipe.transform(value));
    }

    if (isSignal(value)) {
      return this.optionalLocalizePipe.transform(value());
    }

    return this.optionalLocalizePipe.transform(value);
  }
}
