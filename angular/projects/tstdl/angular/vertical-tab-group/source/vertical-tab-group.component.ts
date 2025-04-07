import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, computed, contentChildren, effect, input, model, viewChildren } from '@angular/core';
import { DynamicTextPipe } from '@tstdl/angular';
import { IconComponent } from '@tstdl/angular/icon';
import type { DynamicText } from '@tstdl/base/text';
import { isNull } from '@tstdl/base/utils';

import { VerticalTabComponent } from './vertical-tab/vertical-tab.component';

@Component({
  selector: 'tsl-vertical-tab-group',
  imports: [NgTemplateOutlet, DynamicTextPipe, NgClass, IconComponent],
  templateUrl: './vertical-tab-group.component.html',
  styleUrl: './vertical-tab-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw'
  }
})
export class VerticalTabGroupComponent {
  readonly tabs = contentChildren(VerticalTabComponent);
  readonly tabContainers = viewChildren('tabContainer', { read: ElementRef });

  readonly title = input<DynamicText | null>();
  readonly selectedTabIndex = model<number | null>(null);
  readonly selectedTab = computed(() => this.tabs()[this.selectedTabIndex()!] ?? null);

  constructor() {
    effect(() => {
      if (this.tabs().length == 0) {
        this.selectedTabIndex.set(null);
      }

      const currentIndex = this.selectedTabIndex();

      if (isNull(currentIndex) || (currentIndex >= this.tabs().length)) {
        this.selectedTabIndex.set(0);
      }
    });
  }
}
