import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TstdlCardModule } from '@tstdl/angular/card';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, TstdlCardModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-10'
  }
})
export class CardComponent {
  loading = false;
  headerSeparator = false;
  footerSeparator = false;
  footerBackground = true;
  closeButton = false;
  prePostHeader = false;
}

export default CardComponent;
