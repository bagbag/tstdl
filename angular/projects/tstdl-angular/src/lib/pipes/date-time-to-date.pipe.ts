import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeToDate',
  standalone: true
})
export class DateTimeToDatePipe implements PipeTransform {
  transform(value: DateTime): Date {
    return value.toJSDate();
  }
}
