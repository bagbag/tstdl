import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNullOrUndefined, numericDateToDateTime } from '@tstdl/base/utils';
import type { DateTimeJSOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'numericDateToDateTime',
  standalone: true
})
export class NumericDateToDateTimePipe implements PipeTransform {
  transform(value: number | null | undefined, options?: DateTimeJSOptions): DateTime | null {
    if (isNullOrUndefined(value)) {
      return null;
    }

    return numericDateToDateTime(value, undefined, options);
  }
}
