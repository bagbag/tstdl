import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeToDate'
})
export class DateTimeToDatePipe implements PipeTransform {
  transform(value: DateTime): Date {
    return value.toJSDate();
  }
}
