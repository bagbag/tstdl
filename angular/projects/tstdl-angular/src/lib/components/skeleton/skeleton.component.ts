import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'tsl-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {
  @Input()
  @HostBinding('class.dark')
  dark: boolean | undefined;

  @HostBinding('class.light')
  get light(): boolean {
    return this.dark === false;
  }
}
