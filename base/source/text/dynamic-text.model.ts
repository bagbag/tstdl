import { container } from '#/container';
import type { PickBy, ReplaceKey } from '#/types';
import { isString } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import { combineLatest, isObservable, map, of, switchMap } from 'rxjs';
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

export function resolveDynamicTexts$(texts: DynamicText[], localizationService?: LocalizationService): Observable<string[]> {
  const resolvedLocalizationService = localizationService ?? container.resolve(LocalizationService);
  const resolvedTextObservables = texts.map((text) => resolveDynamicText$(text, resolvedLocalizationService));

  return combineLatest(resolvedTextObservables);
}

export function resolveNestedDynamicText$<T, K extends keyof PickBy<T, DynamicText>>(item: T, key: K, localizationService?: LocalizationService): Observable<ReplaceKey<T, K, string>> {
  return resolveDynamicText$(item[key] as DynamicText, localizationService)
    .pipe(
      map((resolvedText) => ({ ...item, [key]: resolvedText }) as ReplaceKey<T, K, string>)
    );
}

export function resolveNestedDynamicTexts$<T, K extends keyof PickBy<T, DynamicText>>(items: T[], key: K, localizationService?: LocalizationService): Observable<ReplaceKey<T, K, string>[]> {
  const resolvedLocalizationService = localizationService ?? container.resolve(LocalizationService);
  const resolvedTextObservables = items.map((item) => resolveNestedDynamicText$(item, key, resolvedLocalizationService));

  return combineLatest(resolvedTextObservables);
}
