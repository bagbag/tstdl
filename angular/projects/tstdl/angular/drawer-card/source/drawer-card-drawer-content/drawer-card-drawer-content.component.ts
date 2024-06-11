import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, signal } from '@angular/core';

@Component({
  selector: 'tsl-drawer-card-drawer-content',
  standalone: true,
  imports: [],
  templateUrl: './drawer-card-drawer-content.component.html',
  styleUrl: './drawer-card-drawer-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.drawer-collapse]': '!open()'
  }
})
export class DrawerCardDrawerContentComponent {
  readonly containerClasses = input<string | string[] | Record<string, any> | null | undefined>(null);

  readonly open = signal(false);
}
