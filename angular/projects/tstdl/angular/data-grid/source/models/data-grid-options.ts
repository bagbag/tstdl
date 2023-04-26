import type { Provider } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';

export class DataGridOptions {
  booleanTrueText?: DynamicText;
  booleanFalseText?: DynamicText;
  noValueText?: DynamicText;
  itemColumns?: number;
}

export function provideDataGridOptions(options: DataGridOptions): Provider {
  return { provide: DataGridOptions, useValue: options };
}
