import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { isArray, isNullOrUndefined, isString } from '@tstdl/base/utils';

@Pipe({
  name: 'numberLocale',
  standalone: true
})
export class NumberLocalePipe implements PipeTransform {
  transform(value: number | null | undefined, locales: string | string[], options?: Intl.NumberFormatOptions): string | null;
  transform(value: number | null | undefined, options?: Intl.NumberFormatOptions | null): string | null;
  transform(value: number | null | undefined, localesOrOptions?: string | string[] | Intl.NumberFormatOptions | null, optionsOrNothing?: Intl.NumberFormatOptions): string | null {
    if (isNullOrUndefined(value)) {
      return null;
    }

    const localesProvided = isString(localesOrOptions) || isArray(localesOrOptions);
    const locales = localesProvided ? localesOrOptions : (navigator.languages as string[]);
    const options = (localesProvided ? optionsOrNothing : localesOrOptions) ?? undefined;

    return new Intl.NumberFormat(locales, options).format(value);
  }
}
