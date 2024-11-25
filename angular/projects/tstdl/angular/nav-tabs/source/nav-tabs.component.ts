import { ChangeDetectionStrategy, Component, Signal, ViewEncapsulation, contentChildren, input, output } from '@angular/core';

import { NavTabComponent } from './tab/nav-tab.component';

@Component({
  selector: 'tsl-nav-tabs, [tslNavTabs]',
  templateUrl: './nav-tabs.component.html',
  styleUrl: './nav-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw flex',
    '[class.design-register]': 'design() == "register"',
    '[class.design-underline]': 'design() == "underline"'
  }
})
export class NavTabsComponent<T> {
  readonly tabs: Signal<readonly NavTabComponent<T>[]> = contentChildren(NavTabComponent);

  readonly design = input<'underline' | 'register'>('underline');
  readonly tabSelected = output<T>();
}
