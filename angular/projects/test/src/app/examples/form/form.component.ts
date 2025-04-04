import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputComponent, InputGroupComponent, InputGroupLabelComponent, SelectComponent, SelectOptionComponent } from '@tstdl/angular/form';

@Component({
  selector: 'app-form',
  imports: [InputGroupComponent, InputComponent, InputGroupLabelComponent, SelectComponent, SelectOptionComponent, FormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormComponent {
  readonly gender = signal('male');

  constructor() {
    effect(() => console.log(this.gender()));
  }
}
