import { container } from '#/container';
import { isString } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import { isObservable, of, switchMap } from 'rxjs';
import type { LocalizableText } from './localizable-text.model';
import { LocalizationService } from './localization.service';

export type DynamicText = LocalizableText | Observable<LocalizableText>;

export function resolveDynamicText$(text: DynamicText, localizationService?: LocalizationService): Observable<string> {
  const resolvedLocalizationService = localizationService ?? container.resolve(LocalizationService);

  if (isObservable(text)) {
    return text.pipe(switchMap((inner) => resolveDynamicText$(inner, localizationService)));
  }

  if (isString(text)) {
    return of(text);
  }

  return resolvedLocalizationService.localize$(text);
}
