import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNullOrUndefined, toDateTime } from '@tstdl/base/utils';
import type { DateTime, DateTimeFormatOptions } from 'luxon';

@Pipe({
  name: 'dateTime',
  standalone: true
})
export class DateTimePipe implements PipeTransform {
  transform(input: Date | DateTime | number | null | undefined, format: string, options?: DateTimeFormatOptions): string | null {
    if (isNullOrUndefined(input)) {
      return null;
    }

    const dateTime = toDateTime(input);
    return dateTime.toFormat(format, options);
  }
}
