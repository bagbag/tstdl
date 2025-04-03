import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonComponent } from '@tstdl/angular/button';
import { englishTstdlCommonLocalization, germanTstdlCommonLocalization, LocalizationService } from '@tstdl/base/text';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  readonly #localizationService = inject(LocalizationService);

  readonly routes = [
    { href: '/button', label: 'Button' },
    { href: '/icon', label: 'Icon' },
    { href: '/form', label: 'Form' },
    { href: '/nav-tabs', label: 'Nav Tabs' },
    { href: '/card', label: 'Card' },
    { href: '/drawer-card', label: 'Drawer Card' },
    { href: '/dialog', label: 'Dialog' },
    { href: '/data-card', label: 'Data Card' },
    { href: '/data-grid', label: 'Data Grid' },
    { href: '/vertical-tab-group', label: 'Vertical Tab Group' },
    { href: '/react', label: 'React' },
    { href: '/markdown', label: 'Markdown' },
    { href: '/misc', label: 'Miscellaneous' }
  ];

  constructor() {
    this.#localizationService.registerLocalization(germanTstdlCommonLocalization, englishTstdlCommonLocalization);
  }
}
