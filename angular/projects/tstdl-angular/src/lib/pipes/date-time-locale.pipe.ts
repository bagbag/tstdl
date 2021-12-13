import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNumber } from '@tstdl/base/utils';
import type { DateTimeFormatOptions, LocaleOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeLocale'
})
export class DateTimeLocalePipe implements PipeTransform {
  transform(dateTimeOrTimestamp: DateTime | number, format?: keyof typeof DateTime | DateTimeFormatOptions, options?: LocaleOptions): string {
    const dateTime = isNumber(dateTimeOrTimestamp) ? DateTime.fromMillis(dateTimeOrTimestamp) : dateTimeOrTimestamp;

    const formatOptions = (typeof format == 'string')
      ? DateTime[format] as DateTimeFormatOptions
      : format;

    return dateTime.toLocaleString(formatOptions, options);
  }
}
