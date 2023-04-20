import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'tsl-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TstdlSkeletonComponent {
  @Input()
  @HostBinding('class.dark')
  dark: boolean | undefined;

  @HostBinding('class.light')
  get light(): boolean {
    return this.dark === false;
  }

  @Input()
  @HostBinding('style.width')
  width: string | null | undefined;

  @Input()
  @HostBinding('style.height')
  height: string | null | undefined;

  @Input()
  @HostBinding('style.--tsl-skeleton-border-radius')
  borderRadius: string | null | undefined;

  @Input()
  @HostBinding('style.--tsl-skeleton-pulse-size')
  pulseSize: string | null | undefined;

  @Input()
  @HostBinding('style.--tsl-skeleton-pulse-scale')
  pulseScale: number | string | null | undefined;

  @Input()
  @HostBinding('style.--tsl-skeleton-pulse-duration')
  pulseDuration: string | null | undefined;
}
