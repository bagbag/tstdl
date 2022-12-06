import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNull } from '@tstdl/base/utils';
import type { DateTimeOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'timestampToDateTime',
  standalone: true
})
export class TimestampToDateTimePipe implements PipeTransform {
  transform(timestamp: number | null, options?: DateTimeOptions): DateTime | null {
    if (isNull(timestamp)) {
      return null;
    }

    return DateTime.fromMillis(timestamp, options);
  }
}
