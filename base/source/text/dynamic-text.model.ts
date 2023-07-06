import type { Observable } from 'rxjs';

import { container } from '#/container/index.js';
import type { Signal } from '#/signals/api.js';
import { isSignal } from '#/signals/api.js';
import { toObservable } from '#/signals/implementation/to-observable.js';
import { toSignal } from '#/signals/implementation/to-signal.js';
import type { PickBy, ReactiveValue, ReplaceKey } from '#/types.js';
import { isString } from '#/utils/type-guards.js';
import { combineLatest, isObservable, map, of, switchMap } from 'rxjs';
import type { LocalizableText } from './localizable-text.model.js';
import { LocalizationService } from './localization.service.js';

export type DynamicText = ReactiveValue<LocalizableText>;

const missingLocalizationKeyText = '[MISSING LOCALIZATION KEY]';

export function resolveDynamicText(text: DynamicText, localizationService?: LocalizationService): Signal<string> {
  return toSignal(resolveDynamicText$(text, localizationService), { initialValue: missingLocalizationKeyText });
}

export function resolveDynamicText$(text: DynamicText, localizationService?: LocalizationService): Observable<string> {
  const resolvedLocalizationService = localizationService ?? container.resolve(LocalizationService);

  if (isObservable(text)) {
    return text.pipe(switchMap((inner) => resolveDynamicText$(inner, localizationService)));
  }

  if (isSignal(text)) {
    const text$ = toObservable(text);
    return resolveDynamicText$(text$, resolvedLocalizationService);
  }

  if (isString(text)) {
    return of(text);
  }

  return resolvedLocalizationService.localize$(text);
}

export function resolveDynamicTexts(texts: DynamicText[], localizationService?: LocalizationService): Signal<string[]> {
  const initialValue = texts.map(() => missingLocalizationKeyText);
  return toSignal(resolveDynamicTexts$(texts, localizationService), { initialValue });
}

export function resolveDynamicTexts$(texts: DynamicText[], localizationService?: LocalizationService): Observable<string[]> {
  const resolvedLocalizationService = localizationService ?? container.resolve(LocalizationService);
  const resolvedTextObservables = texts.map((text) => resolveDynamicText$(text, resolvedLocalizationService));

  return combineLatest(resolvedTextObservables);
}

export function resolveNestedDynamicText<T, K extends keyof PickBy<T, DynamicText>>(item: T, key: K, localizationService?: LocalizationService): Signal<ReplaceKey<T, K, string>> {
  return toSignal(resolveNestedDynamicText$(item, key, localizationService), { requireSync: true });
}

export function resolveNestedDynamicText$<T, K extends keyof PickBy<T, DynamicText>>(item: T, key: K, localizationService?: LocalizationService): Observable<ReplaceKey<T, K, string>> {
  return resolveDynamicText$(item[key] as DynamicText, localizationService).pipe(
    map((resolvedText) => ({ ...item, [key]: resolvedText }) as ReplaceKey<T, K, string>)
  );
}

export function resolveNestedDynamicTexts<T, K extends keyof PickBy<T, DynamicText>>(items: T[], key: K, localizationService?: LocalizationService): Signal<ReplaceKey<T, K, string>[]> {
  return toSignal(resolveNestedDynamicTexts$(items, key, localizationService), { requireSync: true });
}

export function resolveNestedDynamicTexts$<T, K extends keyof PickBy<T, DynamicText>>(items: T[], key: K, localizationService?: LocalizationService): Observable<ReplaceKey<T, K, string>[]> {
  const resolvedLocalizationService = localizationService ?? container.resolve(LocalizationService);
  const resolvedTextObservables = items.map((item) => resolveNestedDynamicText$(item, key, resolvedLocalizationService));

  return combineLatest(resolvedTextObservables);
}
