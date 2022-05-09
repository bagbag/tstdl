import type { Observable } from 'rxjs';
import type { LocalizationData } from '../services';

export type Text = string | LocalizationData | Observable<string | LocalizationData>;
