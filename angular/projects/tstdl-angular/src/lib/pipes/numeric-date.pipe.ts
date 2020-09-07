import { Pipe, PipeTransform } from '@angular/core';
import { numericDateToDate } from '@tstdl/base/utils';
import { DateTime } from 'luxon';

@Pipe({
  name: 'numericDate'
})
export class NumericDatePipe implements PipeTransform {
  transform(value: number, zone?: string): Date {
    const dateObject = numericDateToDate(value);
    return DateTime.fromObject({ ...dateObject, zone }).toJSDate();
  }
}
