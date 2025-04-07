import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '@tstdl/angular/button';
import { TslMenu, TslMenuOption, TslMenuOverlay, TslMenuOrigin } from '@tstdl/angular/menu';

@Component({
  selector: 'app-menu',
  imports: [ButtonComponent, OverlayModule, TslMenu, TslMenuOption, TslMenuOrigin, TslMenuOverlay],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuExampleComponent {
}
