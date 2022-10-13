import type { Observable } from 'rxjs';
import type { LocalizableText } from './localizable-text.model';

export type DynamicText = LocalizableText | Observable<LocalizableText>;
