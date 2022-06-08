import type { Observable } from 'rxjs';
import type { LocalizationData } from '../services';

export type DynamicText = string | LocalizationData | Observable<string | LocalizationData>;

/**
 * @deprecated use {@link DynamicText} instead
 */
export type Text = DynamicText;
