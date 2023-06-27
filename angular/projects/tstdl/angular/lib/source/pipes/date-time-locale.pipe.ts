import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNullOrUndefined, toDateTime } from '@tstdl/base/utils';
import type { DateTimeFormatOptions, LocaleOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'dateTimeLocale',
  standalone: true
})
export class DateTimeLocalePipe implements PipeTransform {
  transform(input: Date | DateTime | number | null | undefined, format?: keyof typeof DateTime | DateTimeFormatOptions, options?: LocaleOptions): string | null {
    if (isNullOrUndefined(input)) {
      return null;
    }

    const dateTime = toDateTime(input);

    const formatOptions = (typeof format == 'string')
      ? DateTime[format] as DateTimeFormatOptions
      : format;

    return dateTime.toLocaleString(formatOptions, options);
  }
}
