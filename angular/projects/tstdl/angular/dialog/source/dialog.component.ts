import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { DynamicTextPipe } from '@tstdl/angular';
import type { DynamicText } from '@tstdl/base/text';

@Component({
  selector: 'tsl-dialog',
  imports: [DynamicTextPipe],
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw'
  }
})
export class DialogComponent {
  readonly header = input<DynamicText | null>();
  readonly subHeader = input<DynamicText | null>();
}
