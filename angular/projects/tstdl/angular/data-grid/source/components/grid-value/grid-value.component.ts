import { NgTemplateOutlet } from '@angular/common';
import type { OnChanges } from '@angular/core';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DateTimeLocalePipe, DynamicTextPipe, LocalizeEnumPipe, NumberLocalePipe, NumericDateToDateTimePipe, NumericTimeToDateTimePipe } from '@tstdl/angular';
import type { DynamicText } from '@tstdl/base/text';
import { isBoolean, isDate, isNotNullOrUndefined, isNullOrUndefined, isNumber, isString } from '@tstdl/base/utils';
import { DateTime, Duration } from 'luxon';
import type { GridItemDirective } from '../../directives/grid-item.directive';
import type { GridValue, GridValueType } from '../../models';

const dateShort: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
};

const timeShort: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit'
};

@Component({
  selector: 'tsl-grid-value',
  imports: [NgTemplateOutlet, DynamicTextPipe, NumberLocalePipe, DateTimeLocalePipe, NumericDateToDateTimePipe, LocalizeEnumPipe, NumericTimeToDateTimePipe],
  templateUrl: './grid-value.component.html',
  styleUrls: ['./grid-value.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'leading-4'
  }
})
export class GridValueComponent implements OnChanges {
  readonly dateShort = dateShort;
  readonly timeShort = timeShort;

  actualValue: any;
  actualValueType: GridValueType | null;

  @Input() item: GridItemDirective | null | undefined;
  @Input() numberFormat: Intl.NumberFormatOptions | null | undefined;
  @Input() dateFormat: Intl.DateTimeFormatOptions | null | undefined;
  @Input() timeFormat: Intl.DateTimeFormatOptions | null | undefined;
  @Input() booleanTrueText: DynamicText | null | undefined;
  @Input() booleanFalseText: DynamicText | null | undefined;
  @Input() noValueText: DynamicText | null | undefined;

  get percentFormat(): Intl.NumberFormatOptions {
    return { style: 'percent', minimumFractionDigits: 2, ...this.numberFormat };
  }

  get percentPointFormat(): Intl.NumberFormatOptions {
    return { style: 'percent', minimumFractionDigits: 2, ...this.numberFormat };
  }

  get currencyFormat(): Intl.NumberFormatOptions {
    return { style: 'currency', currency: 'EUR', ...this.numberFormat };
  }

  ngOnChanges(): void {
    if (isNullOrUndefined(this.item)) {
      this.actualValue = null;
      this.actualValueType = null;
    }
    else if (isNullOrUndefined(this.item.value)) {
      this.actualValue = this.item.nullValue;
      this.actualValueType = this.getActualValueType(this.item.nullValue);
    }
    else {
      this.actualValue = this.item.value;
      this.actualValueType = this.item.valueType ?? this.getActualValueType(this.item.value);
    }
  }

  private getActualValueType(value: GridValue): GridValueType | null {
    if (isNullOrUndefined(value) || isNullOrUndefined(this.item)) {
      return null;
    }

    if (isNotNullOrUndefined(this.item.enum)) {
      return 'enum';
    }

    if (isNumber(value)) {
      return 'number';
    }

    if (isString(value)) {
      return 'text';
    }

    if ((value instanceof DateTime) || isDate(value)) {
      return 'date';
    }

    if (value instanceof Duration) {
      return 'time';
    }

    if (isBoolean(value)) {
      return 'boolean';
    }

    return null;
  }
}
