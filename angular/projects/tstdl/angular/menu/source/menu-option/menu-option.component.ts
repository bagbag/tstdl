import { ChangeDetectionStrategy, Component, HostListener, inject, ViewEncapsulation } from '@angular/core';

import { TslMenu } from '../menu/menu.component';

@Component({
  selector: '[tslMenuOption]',
  imports: [],
  templateUrl: './menu-option.component.html',
  styleUrls: ['./menu-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class TslMenuOption {
  readonly #menu = inject(TslMenu);

  @HostListener('click')
  onClick() {
    this.#menu.open.set(false);
  }
}
