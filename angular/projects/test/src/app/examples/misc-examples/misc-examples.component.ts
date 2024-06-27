import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '@tstdl/angular/button';
import { InputComponent } from '@tstdl/angular/form';

@Component({
  selector: 'app-misc-examples',
  standalone: true,
  imports: [ButtonComponent, InputComponent],
  templateUrl: './misc-examples.component.html',
  styleUrl: './misc-examples.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiscExamplesComponent {

}
