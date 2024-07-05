import { ChangeDetectionStrategy, Component, HostListener, inject, input, model, ViewEncapsulation } from '@angular/core';

import { NavTabsComponent } from '../nav-tabs.component';

@Component({
  selector: 'tsl-nav-tab, [tslNavTab]',
  standalone: true,
  imports: [],
  templateUrl: './nav-tab.component.html',
  styleUrl: './nav-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.tab-active]': 'active()'
  }
})
export class NavTabComponent<T> {
  readonly navTabs = inject(NavTabsComponent);
  readonly active = model<boolean>(false);

  readonly data = input<T>();

  @HostListener('click')
  onClick(): void {
    this.navTabs.tabSelected(this);
  }
}
