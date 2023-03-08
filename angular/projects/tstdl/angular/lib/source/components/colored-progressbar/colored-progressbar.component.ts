import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import * as chroma from 'chroma-js';
import { widthAnimation } from '../../animations/width.animation';
import { LifecycleUtils } from '../../utils/lifecycle';

const progressColorScaler = chroma.scale(['#dc2626', '#ea580c', '#facc15', '#65a30d'])
  .classes([0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1])
  .mode('lab');

@Component({
  selector: 'tsl-colored-progressbar',
  templateUrl: './colored-progressbar.component.html',
  standalone: true,
  styleUrls: ['./colored-progressbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    widthAnimation({ timing: '1000ms ease' })
  ],
  host: {
    '[class.tsl-tw]': 'true'
  }
})
export class ColoredProgressbarComponent extends LifecycleUtils<ColoredProgressbarComponent> {
  @Input() progress: number | undefined;

  @HostBinding('class.tsl-rounded-full')
  @Input() rounded: boolean;

  @HostBinding('style.background-color')
  get backgroundColor(): string {
    return progressColorScaler(this.progress).alpha(0.3).hex();
  }

  get progressbarColor(): string {
    return progressColorScaler(this.progress).desaturate(1).hex();
  }

  get width(): string {
    return `${Math.min(this.progress ?? 0, 1) * 100}%`;
  }

  constructor() {
    super();

    this.progress = 0;
    this.rounded = false;
  }
}
