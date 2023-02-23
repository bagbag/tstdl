import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNullOrUndefined, numericTimeToTimeObject } from '@tstdl/base/utils';
import type { DateTimeJSOptions } from 'luxon';
import { DateTime } from 'luxon';

@Pipe({
  name: 'numericTimeToDateTime',
  standalone: true
})
export class NumericTimeToDateTimePipe implements PipeTransform {
  transform(numericTime: number | null | undefined, options?: DateTimeJSOptions): DateTime | null {
    if (isNullOrUndefined(numericTime)) {
      return null;
    }

    const timeObject = numericTimeToTimeObject(numericTime);

    if (Number.isNaN(timeObject.hour)) {
      return DateTime.invalid('NaN time');
    }

    return DateTime.fromObject(timeObject, options);
  }
}
