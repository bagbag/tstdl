import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TstdlDataGridModule } from '@tstdl/angular/data-grid';
import { LocalizationService, enumerationLocalization } from '@tstdl/base/text';
import { now } from '@tstdl/base/utils';

enum MyEnum {
  MyFoo = 0,
  MyBar = 1
}

@Component({
  selector: 'app-data-grid',
  imports: [TstdlDataGridModule],
  templateUrl: './data-grid.component.html',
  styleUrls: ['./data-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataGridComponent {
  readonly MyEnum = MyEnum;

  get now(): Date {
    return now();
  }

  constructor(localizationService: LocalizationService) {
    localizationService.registerLocalization({
      language: {
        code: 'en',
        name: 'English'
      },
      keys: {},
      enums: [
        enumerationLocalization(MyEnum, 'MyEnum (localized)', {
          [MyEnum.MyBar]: 'Bar',
          [MyEnum.MyFoo]: 'Foo'
        })
      ]
    });
  }
}

export default DataGridComponent;
