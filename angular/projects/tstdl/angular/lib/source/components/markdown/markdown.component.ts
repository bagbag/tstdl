import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { marked } from 'marked';

@Component({
  selector: 'tsl-markdown, [tslMarkdown]',
  imports: [],
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TstdlMarkdownComponent {
  @Input() markdown: string | null | undefined;

  @HostBinding('innerHTML')
  get markdownHtml(): string {
    return marked(this.markdown ?? '') as string;
  }
}
