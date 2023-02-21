import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNull } from '@tstdl/base/utils';
import type { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeToDate',
  standalone: true
})
export class DateTimeToDatePipe implements PipeTransform {
  transform(value: DateTime | null): Date | null {
    if (isNull(value)) {
      return null;
    }

    return value.toJSDate();
  }
}
