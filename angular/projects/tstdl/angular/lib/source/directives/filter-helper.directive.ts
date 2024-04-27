import { Directive, computed, input, model } from '@angular/core';
import { PropertiesOfType } from '@tstdl/base/types';
import { isFunction, isNull, isString, normalizeText } from '@tstdl/base/utils';

@Directive({
  selector: '[tslFilterHelper]',
  standalone: true,
  exportAs: 'filterHelper'
})
export class FilterHelperDirective<T> {
  readonly filterValues = input<T[] | null | undefined>();
  readonly filterSelector = input<PropertiesOfType<T, string> | (() => string)>();
  readonly filter = model<string | null>(null);

  readonly normalizedFilterValues = computed(() => {
    const selector = this.filterSelector();

    const valueSelector = isString(selector)
      ? (value: T) => value[selector as keyof T] as string
      : isFunction(selector)
        ? selector
        : ((value: T) => String(value));

    return this.filterValues()?.map((value) => ({ value, searchValue: normalizeText(valueSelector(value)) })) ?? [];
  });

  readonly filteredValues = computed(() => {
    const filter = this.filter();

    if (isNull(filter)) {
      return this.filterValues() ?? [];
    }

    const normalizedFilter = normalizeText(filter);

    if (normalizedFilter.length == 0) {
      return this.filterValues() ?? [];
    }

    return this.normalizedFilterValues()
      .filter(({ searchValue }) => searchValue.includes(normalizedFilter))
      .map(({ value }) => value);
  });
}
