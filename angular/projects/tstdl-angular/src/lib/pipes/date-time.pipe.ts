import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNull, isNumber } from '@tstdl/base/utils';
import type { DateTimeFormatOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'dateTime',
  standalone: true
})
export class DateTimePipe implements PipeTransform {
  transform(dateTimeOrTimestamp: DateTime | number | null, format: string, options?: DateTimeFormatOptions): string | null {
    if (isNull(dateTimeOrTimestamp)) {
      return null;
    }

    const dateTime = isNumber(dateTimeOrTimestamp) ? DateTime.fromMillis(dateTimeOrTimestamp) : dateTimeOrTimestamp;
    return dateTime.toFormat(format, options);
  }
}
