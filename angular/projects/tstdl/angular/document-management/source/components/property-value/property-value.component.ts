import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { DateTimeLocalePipe, NumberLocalePipe, NumericDateToDateTimePipe } from '@tstdl/angular';
import { IconComponent } from '@tstdl/angular/icon';
import { DocumentPropertyDataType, type DocumentPropertyValueView } from '@tstdl/base/document-management';
import { dateShort, decimalFormat, integerFormat } from '@tstdl/base/formats';

@Component({
  selector: '[tslPropertyValue]',
  imports: [NumberLocalePipe, NumericDateToDateTimePipe, DateTimeLocalePipe, IconComponent],
  templateUrl: './property-value.component.html',
  styleUrl: './property-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PropertyValueComponent {
  readonly property = input.required<DocumentPropertyValueView>();

  readonly DocumentPropertyDataType = DocumentPropertyDataType;
  readonly integerFormat = integerFormat;
  readonly decimalFormat = decimalFormat;
  readonly dateShort = dateShort;
}
