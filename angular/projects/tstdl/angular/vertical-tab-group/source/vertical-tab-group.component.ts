import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, computed, contentChildren, effect, input, model, viewChildren } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DynamicTextPipe } from '@tstdl/angular';
import type { DynamicText } from '@tstdl/base/text';
import { isNull } from '@tstdl/base/utils';

import { VerticalTabItemComponent } from './vertical-tab-item/vertical-tab-item.component';
import { VerticalTabComponent } from './vertical-tab/vertical-tab.component';

@Component({
  selector: 'tsl-vertical-tab-group',
  imports: [NgTemplateOutlet, DynamicTextPipe, NgClass, RouterLink, RouterLinkActive, VerticalTabItemComponent],
  templateUrl: './vertical-tab-group.component.html',
  styleUrl: './vertical-tab-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw',
  },
})
export class VerticalTabGroupComponent {
  readonly tabs = contentChildren(VerticalTabComponent);
  readonly tabContainers = viewChildren('tabContainer', { read: ElementRef });

  readonly isRouterDriven = computed(() => this.tabs().some((tab) => !isNull(tab.routerLink())));

  readonly title = input<DynamicText | null>();
  readonly selectedTabIndex = model<number | null>(null);
  readonly selectedTab = computed(() => this.tabs()[this.selectedTabIndex()!] ?? null);

  constructor() {
    effect(() => {
      // If we are using the router, let it handle the active state.
      // This effect should only manage the index for non-router-driven tabs.
      if (this.isRouterDriven()) {
        return;
      }

      const tabs = this.tabs();
      const currentIndex = this.selectedTabIndex();

      if (tabs.length == 0) {
        this.selectedTabIndex.set(null);
        return;
      }

      if (isNull(currentIndex) || (currentIndex < 0) || (currentIndex >= tabs.length)) {
        this.selectedTabIndex.set(0);
      }
    });
  }
}
