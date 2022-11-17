import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isNumber } from '@tstdl/base/utils';
import type { DurationObjectUnits, DurationOptions } from 'luxon';
import { Duration } from 'luxon';

@Pipe({
  name: 'duration',
  standalone: true
})
export class DurationPipe implements PipeTransform {
  transform(millisecondsOrObject: number | Duration | DurationObjectUnits, format: string, options?: DurationOptions, formatOptions?: Parameters<Duration['toFormat']>[1]): string {
    const duration = isNumber(millisecondsOrObject)
      ? Duration.fromMillis(millisecondsOrObject, options)
      : millisecondsOrObject instanceof Duration
        ? millisecondsOrObject
        : Duration.fromObject(millisecondsOrObject, options);

    return duration.toFormat(format, formatOptions);
  }
}
