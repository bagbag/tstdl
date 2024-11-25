import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DrawerCardComponent, DrawerCardContentComponent, DrawerCardDrawerContentComponent } from '@tstdl/angular/drawer-card';

@Component({
  selector: 'app-drawer-card-example',
  imports: [DrawerCardComponent, DrawerCardContentComponent, DrawerCardDrawerContentComponent],
  templateUrl: './drawer-card-example.component.html',
  styleUrl: './drawer-card-example.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DrawerCardExampleComponent {

}
