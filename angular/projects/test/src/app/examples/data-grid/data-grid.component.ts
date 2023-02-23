import { ChangeDetectionStrategy, Component } from '@angular/core';
import { now } from '@tstdl/base/utils';

enum MyEnum {
  MyFoo = 0,
  MyBar = 1
}

@Component({
  selector: 'app-data-grid',
  templateUrl: './data-grid.component.html',
  styleUrls: ['./data-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataGridComponent {
  readonly MyEnum = MyEnum;

  get now(): Date {
    return now();
  }
}
