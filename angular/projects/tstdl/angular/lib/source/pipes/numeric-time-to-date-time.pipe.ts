import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNull, numericTimeToTimeObject } from '@tstdl/base/utils';
import { DateTime, DateTimeJSOptions } from 'luxon';

@Pipe({
  name: 'numericTimeToDateTime',
  standalone: true
})
export class NumericTimeToDateTimePipe implements PipeTransform {
  transform(numericTime: number | null, options?: DateTimeJSOptions): DateTime | null {
    if (isNull(numericTime)) {
      return null;
    }

    const { hour, minute, second, millisecond } = numericTimeToTimeObject(numericTime);
    return DateTime.fromObject({ hour, minute, second, millisecond }, options);
  }
}
