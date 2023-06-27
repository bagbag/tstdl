import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNullOrUndefined } from '@tstdl/base/utils';
import type { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeToDate',
  standalone: true
})
export class DateTimeToDatePipe implements PipeTransform {
  transform(value: DateTime | null | undefined): Date | null {
    if (isNullOrUndefined(value)) {
      return null;
    }

    return value.toJSDate();
  }
}
