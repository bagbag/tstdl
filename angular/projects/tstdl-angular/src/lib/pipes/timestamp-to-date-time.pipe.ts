import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { DateTimeOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'timestampToDateTime',
  standalone: true
})
export class TimestampToDateTimePipe implements PipeTransform {
  transform(timestamp: number, options?: DateTimeOptions): DateTime {
    return DateTime.fromMillis(timestamp, options);
  }
}
