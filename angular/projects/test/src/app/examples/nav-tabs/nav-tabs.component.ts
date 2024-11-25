import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavTabComponent, NavTabsComponent } from '@tstdl/angular/nav-tabs';

@Component({
  selector: 'app-nav-tabs',
  imports: [NavTabsComponent, NavTabComponent],
  templateUrl: './nav-tabs.component.html',
  styleUrl: './nav-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'full'
  }
})
export class NavTabsExampleComponent {

}
