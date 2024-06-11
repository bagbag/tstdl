import { NgClass } from '@angular/common';
import { AfterRenderPhase, ChangeDetectionStrategy, Component, ViewEncapsulation, afterNextRender, booleanAttribute, contentChild, effect, input, model } from '@angular/core';
import { collapseAnimation } from '@tstdl/angular';

import { DrawerCardContentComponent } from './drawer-card-content/drawer-card-content.component';
import { DrawerCardDrawerContentComponent } from './drawer-card-drawer-content/drawer-card-drawer-content.component';

@Component({
  selector: 'tsl-drawer-card',
  standalone: true,
  imports: [NgClass],
  templateUrl: './drawer-card.component.html',
  styleUrl: './drawer-card.component.scss',
  animations: [collapseAnimation({ duration: 300, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class DrawerCardComponent {
  private readonly contentComponent = contentChild(DrawerCardContentComponent);

  readonly drawerContentComponent = contentChild(DrawerCardDrawerContentComponent);

  readonly open = model<boolean>(false);
  readonly manualOpen = input<boolean, boolean | `${boolean}`>(false, { transform: booleanAttribute });
  readonly interactive = input<boolean, boolean | `${boolean}`>(true, { transform: booleanAttribute });

  constructor() {
    effect(() => this.drawerContentComponent()?.open.set(this.open()), { allowSignalWrites: true });
    effect(() => this.contentComponent()?.interactive.set(this.interactive()), { allowSignalWrites: true });

    afterNextRender(() => this.contentComponent()?.clicked.subscribe(() => {
      if (!this.manualOpen()) {
        this.open.update((open) => !open);
      }
    }), { phase: AfterRenderPhase.Write });
  }
}
