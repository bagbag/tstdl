import { ChangeDetectionStrategy, Component, TemplateRef, ViewEncapsulation, input, viewChild } from '@angular/core';
import { IconName } from '@tstdl/angular/icon';
import { DynamicText } from '@tstdl/base/text';

@Component({
  selector: 'tsl-vertical-tab',
  standalone: true,
  imports: [],
  templateUrl: './vertical-tab.component.html',
  styleUrl: './vertical-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class VerticalTabComponent {
  readonly contentTemplate = viewChild(TemplateRef);

  readonly label = input<DynamicText | null>();
  readonly description = input<DynamicText | null>();
  readonly icon = input<IconName | null>();
  readonly class = input<string>();
}
