import { CdkMenuTrigger } from '@angular/cdk/menu';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '@tstdl/angular/button';
import { TslMenu } from '@tstdl/angular/menu';

@Component({
  selector: 'app-menu',
  imports: [ButtonComponent, OverlayModule, TslMenu, CdkMenuTrigger],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuExampleComponent {
}
