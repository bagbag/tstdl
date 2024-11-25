import { ChangeDetectionStrategy, Component, HostListener, inject, input, output, ViewEncapsulation } from '@angular/core';

import { NavTabsComponent } from '../nav-tabs.component';

@Component({
  selector: 'tsl-nav-tab, [tslNavTab]',
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
  readonly navTabs = inject(NavTabsComponent) as NavTabsComponent<T>;
  readonly active = input<boolean>(false);
  readonly selected = output();

  readonly data = input<T>();

  @HostListener('click')
  onClick(): void {
    this.selected.emit();
    this.navTabs.tabSelected.emit(this.data()!);
  }
}
