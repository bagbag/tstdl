import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { pipe } from '@tstdl/base/signals';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { delay, of, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'tsl-pdf-viewer',
  imports: [NgxExtendedPdfViewerModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block'
  }
})
export class PdfViewerComponent {
  readonly darkMode = input(false);
  readonly source = input<string | null>();

  readonly url = pipe(
    this.source,
    switchMap((source) => of(source).pipe(delay(1), startWith(undefined)))
  );
}
