import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { DynamicTextPipe } from '@tstdl/angular';
import { IconComponent } from '@tstdl/angular/icon';
import type { VerticalTabComponent } from '../vertical-tab/vertical-tab.component';

@Component({
  selector: 'tsl-vertical-tab-item',
  imports: [IconComponent, DynamicTextPipe, NgTemplateOutlet],
  templateUrl: './vertical-tab-item.component.html',
  styleUrl: './vertical-tab-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class VerticalTabItemComponent {
  readonly tab = input.required<VerticalTabComponent>();
}
