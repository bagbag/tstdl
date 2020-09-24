import { Pipe, PipeTransform } from '@angular/core';
import { numericDateToDate } from '@tstdl/base/utils';
import { DateObject, DateTime } from 'luxon';

@Pipe({
  name: 'numericDateToDate'
})
export class NumericDateToDateTimePipe implements PipeTransform {
  transform(value: number, options?: DateObject): DateTime {
    const dateObject = numericDateToDate(value);
    return DateTime.fromObject({ ...dateObject, ...options });
  }
}
