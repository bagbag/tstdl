import { Directive, computed, input, model } from '@angular/core';
import { PropertiesOfType } from '@tstdl/base/types';
import { isFunction, isString, normalizeText } from '@tstdl/base/utils';

@Directive({
  selector: '[tslFilterHelper]',
  standalone: true,
  exportAs: 'filterHelper'
})
export class FilterHelperDirective<T> {
  readonly filterValues = input<T[]>();
  readonly filterSelector = input<PropertiesOfType<T, string> | (() => string)>();
  readonly filter = model<string>('');

  readonly filteredValues = computed(() => {
    const filter = normalizeText(this.filter().trim());

    if (filter.length == 0) {
      return this.filterValues();
    }

    const selector = this.filterSelector();

    const valueSelector = isString(selector)
      ? (value: T) => value[selector as keyof T] as string
      : isFunction(selector)
        ? selector
        : ((value: T) => String(value));

    return (this.filterValues() ?? []).filter((value) => normalizeText(valueSelector(value)).includes(filter));
  });
}
