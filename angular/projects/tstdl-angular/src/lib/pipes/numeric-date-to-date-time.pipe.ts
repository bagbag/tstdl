import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNull, numericDateToDate } from '@tstdl/base/utils';
import type { DateTimeJSOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'numericDateToDateTime',
  standalone: true
})
export class NumericDateToDateTimePipe implements PipeTransform {
  transform(value: number | null, options?: DateTimeJSOptions): DateTime | null {
    if (isNull(value)) {
      return null;
    }

    const dateObject = numericDateToDate(value);
    return DateTime.fromObject(dateObject, options);
  }
}
