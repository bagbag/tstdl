import { ChangeDetectionStrategy, Component, TemplateRef, ViewEncapsulation, computed, contentChild, input, viewChild } from '@angular/core';
import type { IconName } from '@tstdl/angular/icon';
import type { DynamicText } from '@tstdl/base/text';
import { VerticalTabLabelDirective } from './vertical-tab-label.directive';

@Component({
  selector: 'tsl-vertical-tab',
  imports: [],
  templateUrl: './vertical-tab.component.html',
  styleUrl: './vertical-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class VerticalTabComponent {
  readonly contentTemplate = viewChild(TemplateRef);
  readonly labelRef = contentChild(VerticalTabLabelDirective);

  readonly label = input<DynamicText | null>();
  readonly description = input<DynamicText | null>();
  readonly icon = input<IconName | null>();
  readonly class = input<string>();

  readonly labelTemplateRef = computed(() => this.labelRef()?.templateRef);
}
