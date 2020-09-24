import { Pipe, PipeTransform } from '@angular/core';
import { DateTime, DateTimeFormatOptions, LocaleOptions } from 'luxon';

@Pipe({
  name: 'dateTimeLocale'
})
export class DateTimeLocalePipe implements PipeTransform {
  transform(dateTime: DateTime, options?: keyof typeof DateTime | (LocaleOptions & DateTimeFormatOptions)): string {
    const localeOptions = (typeof options == 'string')
      ? DateTime[options as keyof typeof DateTime] as DateTimeFormatOptions
      : options;

    return dateTime.toLocaleString(localeOptions);
  }
}
