import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ButtonColor, ButtonComponent as TstdlButtonComponent } from '@tstdl/angular/button';
import { IconComponent } from '@tstdl/angular/icon';

@Component({
  selector: 'app-button',
  imports: [TstdlButtonComponent, IconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  readonly colors: ButtonColor[] = ['transparent', 'white', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
}
