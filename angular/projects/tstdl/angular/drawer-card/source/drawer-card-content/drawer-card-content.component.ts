import { ChangeDetectionStrategy, Component, HostListener, type OnDestroy, type OnInit, ViewEncapsulation, effect, inject, output, signal } from '@angular/core';
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
    '[class.interactive]': 'interactive()',
    '[attr.tabindex]': '0',
  },
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
  @HostListener('keyup.enter', ['$event'])
  @HostListener('keyup.space', ['$event'])
  onClick(event?: Event): void {
    event?.preventDefault();
    this.clicked.emit();
  }

  @HostListener('keydown.space', ['$event'])
  preventDefault(event: Event): void {
    event.preventDefault();
  }
}
