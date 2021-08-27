import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { DateTimeFormatOptions, LocaleOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeLocale'
})
export class DateTimeLocalePipe implements PipeTransform {
  transform(dateTime: DateTime, format?: keyof typeof DateTime | DateTimeFormatOptions, options?: LocaleOptions): string {
    const formatOptions = (typeof format == 'string')
      ? DateTime[format] as DateTimeFormatOptions
      : format;

    return dateTime.toLocaleString(formatOptions, options);
  }
}
