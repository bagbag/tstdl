import { Pipe, PipeTransform } from '@angular/core';
import { DateTime, DateTimeOptions } from 'luxon';

@Pipe({
  name: 'timestampToDateTime'
})
export class TimestampToDateTimePipe implements PipeTransform {
  transform(timestamp: number, options?: DateTimeOptions): DateTime {
    return DateTime.fromMillis(timestamp, options);
  }
}
