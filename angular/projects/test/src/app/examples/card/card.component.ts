import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TstdlCardModule } from '@tstdl/angular/card';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [TstdlCardModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent { }
