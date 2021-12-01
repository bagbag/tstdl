import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { numericDateToDate } from '@tstdl/base/utils';
import type { DateTimeJSOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'numericDateToDateTime'
})
export class NumericDateToDateTimePipe implements PipeTransform {
  transform(value: number, options?: DateTimeJSOptions): DateTime {
    const dateObject = numericDateToDate(value);
    return DateTime.fromObject(dateObject, options);
  }
}
