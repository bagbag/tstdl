import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, ViewEncapsulation, effect, inject, output, signal } from '@angular/core';
import { MatRipple } from '@angular/material/core';

@Component({
  selector: 'tsl-drawer-card-content',
  imports: [],
  templateUrl: './drawer-card-content.component.html',
  styleUrl: './drawer-card-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MatRipple],
  host: {
    '[class.interactive]': 'interactive()'
  }
})
export class DrawerCardContentComponent implements OnInit, OnDestroy {
  readonly #ripple = inject(MatRipple);
  readonly clicked = output();

  readonly interactive = signal(false);

  constructor() {
    effect(() => (this.#ripple.disabled = !this.interactive()));
  }

  ngOnInit(): void {
    this.#ripple.ngOnInit();
  }

  ngOnDestroy(): void {
    this.#ripple.ngOnDestroy();
  }

  @HostListener('click')
  onClick(): void {
    this.clicked.emit();
  }
}
