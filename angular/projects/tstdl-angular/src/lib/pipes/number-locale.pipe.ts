import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isArray, isString } from '@tstdl/base/utils';

@Pipe({
  name: 'numberLocale',
  standalone: true
})
export class NumberLocalePipe implements PipeTransform {
  transform(value: number, locales: string | string[], options?: Intl.NumberFormatOptions): string;
  transform(value: number, options?: Intl.NumberFormatOptions): string;
  transform(value: number, localesOrOptions?: string | string[] | Intl.NumberFormatOptions, optionsOrNothing?: Intl.NumberFormatOptions): string {
    const localesProvided = isString(localesOrOptions) || isArray(localesOrOptions);
    const locales = localesProvided ? localesOrOptions : (navigator.languages as string[]);
    const options = localesProvided ? optionsOrNothing : localesOrOptions;

    return new Intl.NumberFormat(locales, options).format(value);
  }
}
