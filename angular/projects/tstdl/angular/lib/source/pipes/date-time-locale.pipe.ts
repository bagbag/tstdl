import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNull, isNumber } from '@tstdl/base/utils';
import type { DateTimeFormatOptions, LocaleOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeLocale',
  standalone: true
})
export class DateTimeLocalePipe implements PipeTransform {
  transform(dateTimeOrTimestamp: DateTime | number | null, format?: keyof typeof DateTime | DateTimeFormatOptions, options?: LocaleOptions): string | null {
    if (isNull(dateTimeOrTimestamp)) {
      return null;
    }

    const dateTime = isNumber(dateTimeOrTimestamp) ? DateTime.fromMillis(dateTimeOrTimestamp) : dateTimeOrTimestamp;

    const formatOptions = (typeof format == 'string')
      ? DateTime[format] as DateTimeFormatOptions
      : format;

    return dateTime.toLocaleString(formatOptions, options);
  }
}
