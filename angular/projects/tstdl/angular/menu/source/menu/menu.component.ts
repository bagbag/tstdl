import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, model } from '@angular/core';

@Component({
  selector: 'tsl-menu',
  imports: [OverlayModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class TslMenu {
  readonly open = model(false);

  toggle(): void {
    this.open.update((open) => !open);
  }
}
