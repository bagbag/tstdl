import { Pipe, PipeTransform } from '@angular/core';
import { DateTime, DateTimeFormatOptions } from 'luxon';

@Pipe({
  name: 'dateTime'
})
export class DateTimePipe implements PipeTransform {
  transform(dateTime: DateTime, format: string, options?: DateTimeFormatOptions): string {
    return dateTime.toFormat(format, options);
  }
}
