import { Pipe, PipeTransform } from '@angular/core';
import { Duration, DurationObject, DurationOptions, DurationToFormatOptions } from 'luxon';

@Pipe({
  name: 'duration'
})
export class DurationPipe implements PipeTransform {
  transform(millisecondsOrObject: number | DurationObject, format: string, options?: DurationOptions, formatOptions?: DurationToFormatOptions): string {
    const duration = typeof millisecondsOrObject == 'number'
      ? Duration.fromMillis(millisecondsOrObject, options)
      : Duration.fromObject({ ...millisecondsOrObject, ...options });

    return duration.toFormat(format, formatOptions);
  }
}
