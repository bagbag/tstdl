import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, contentChildren, effect, model } from '@angular/core';
import { DynamicTextPipe } from '@tstdl/angular';
import { IconComponent } from '@tstdl/angular/icon';
import { isNull } from '@tstdl/base/utils';

import { NavTabComponent } from './tab/nav-tab.component';

@Component({
  selector: 'tsl-nav-tabs, [tslNavTabs]',
  standalone: true,
  imports: [NgTemplateOutlet, DynamicTextPipe, NgClass, IconComponent],
  templateUrl: './nav-tabs.component.html',
  styleUrl: './nav-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw flex'
  }
})
export class NavTabsComponent<T> {
  readonly tabs = contentChildren(NavTabComponent<T>);

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
    }, { allowSignalWrites: true });
  }

  tabSelected(tab: NavTabComponent<T>): void {
    console.log(tab)

    this.selectedTabIndex.set(null);

    this.tabs().forEach((t, tabIndex) => {
      const selected = t == tab;

      t.selected.set(selected);

      if (selected) {
        this.selectedTabIndex.set(tabIndex);
      }
    });
  }
}
