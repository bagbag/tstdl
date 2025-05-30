import { booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, input, ViewEncapsulation } from '@angular/core';
import { observeMediaQuery } from '@tstdl/base/dom';
import { pipe } from '@tstdl/base/signals';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { delay, of, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'tsl-pdf-viewer',
  imports: [NgxExtendedPdfViewerModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'block',
    '[class.pdf-viewer-dark]': 'useDarkMode()',
  }
})
export class PdfViewerComponent {
  readonly authorization = input<boolean, boolean | `${boolean}`>(false, { transform: booleanAttribute });
  readonly darkMode = input<boolean, boolean | `${boolean}`>(undefined, { transform: booleanAttribute });
  readonly source = input<string | null>();

  readonly systemDarkMode = observeMediaQuery('(prefers-color-scheme: dark)');
  readonly useDarkMode = computed(() => this.darkMode() ?? this.systemDarkMode());

  readonly url = pipe(
    this.source,
    switchMap((source) => of(source).pipe(delay(1), startWith(undefined)))
  );

  constructor() {
    effect(() =>
      console.log({
        darkMode: this.darkMode(),
        useDarkMode: this.useDarkMode(),
      })
    );
  }
}
