import { Pipe, PipeTransform } from '@angular/core';
import { Duration, DurationObject, DurationOptions, DurationToFormatOptions } from 'luxon';

@Pipe({
  name: 'duration'
})
export class DurationPipe implements PipeTransform {
  transform(millisecondsOrObject: number | Duration | DurationObject, format: string, options?: DurationOptions, formatOptions?: DurationToFormatOptions): string {
    const duration = typeof millisecondsOrObject == 'number'
      ? Duration.fromMillis(millisecondsOrObject, options)
      : millisecondsOrObject instanceof Duration
        ? millisecondsOrObject
        : Duration.fromObject({ ...millisecondsOrObject, ...options })


    return duration.toFormat(format, formatOptions);
  }
}
