import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation, model } from '@angular/core';
import { enterAnimation } from '@tstdl/angular/animations';

@Component({
  selector: 'tsl-menu',
  imports: [OverlayModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [enterAnimation({ timing: '100ms ease-in-out', scale: 0.9, opacity: true, height: false })]
})
export class TslMenu {
  readonly open = model(false);

  @HostBinding('@enter')
  private readonly enterAnimation: true;

  toggle(): void {
    this.open.update((open) => !open);
  }
}
