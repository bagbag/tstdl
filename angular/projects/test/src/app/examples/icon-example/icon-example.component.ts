import { ChangeDetectionStrategy, Component } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { IconComponent, iconNames } from '@tstdl/angular/icon';
import { randomItems } from '@tstdl/base/utils/array';
import { map, startWith, timer } from 'rxjs';

@Component({
  selector: 'app-icon-example',
  imports: [IconComponent],
  templateUrl: './icon-example.component.html',
  styleUrl: './icon-example.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-wrap gap-8'
  }
})
export class IconExampleComponent {
  readonly icons$ = timer(0, 1000).pipe(
    takeUntilDestroyed(),
    startWith(0),
    map(() => randomItems(iconNames, 15, false))
  );

  readonly icons = toSignal(this.icons$, { requireSync: true });
}
