import { ChangeDetectionStrategy, Component, HostListener, inject, ViewEncapsulation } from '@angular/core';

import { TslMenu } from '../menu/menu.component';
import { TslMenuOverlay } from '../menu-overlay.directive';

@Component({
  selector: '[tslMenuOption]',
  imports: [],
  templateUrl: './menu-option.component.html',
  styleUrls: ['./menu-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class TslMenuOption {
  readonly #menuOverlay = inject(TslMenuOverlay);

  @HostListener('click')
  onClick() {
    this.#menuOverlay.tslMenuOverlayOrigin()?.isOpen.set(false);
  }
}
