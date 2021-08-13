import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { numericDateToDate } from '@tstdl/base/esm/utils';
import type { DateObject } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'numericDateToDateTime'
})
export class NumericDateToDateTimePipe implements PipeTransform {
  transform(value: number, options?: DateObject): DateTime {
    const dateObject = numericDateToDate(value);
    return DateTime.fromObject({ ...dateObject, ...options });
  }
}
