import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '@tstdl/angular/button/public-api';
import { InputComponent } from 'projects/tstdl/angular/input';

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
