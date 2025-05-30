import { ChangeDetectionStrategy, Component, model, ViewEncapsulation } from '@angular/core';
import { DynamicTextPipe, fadeInOutAnimation } from '@tstdl/angular';
import type { DynamicText } from '@tstdl/base/text';

@Component({
  selector: 'tsl-tooltip',
  imports: [DynamicTextPipe],
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [
    fadeInOutAnimation()
  ],
  host: {
    '[@fadeInOut]': 'true'
  }
})
export class TooltipComponent {
  readonly text = model<DynamicText | null>();
}
