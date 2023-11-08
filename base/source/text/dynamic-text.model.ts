import type { Observable } from 'rxjs';
import { isObservable } from 'rxjs';

import { inject } from '#/injector/inject.js';
import type { Signal } from '#/signals/api.js';
import { computed, isSignal, toObservable, toSignal, untracked } from '#/signals/api.js';
import { switchMap } from '#/signals/switch-map.js';
import { runInUntracked } from '#/signals/untracked-operator.js';
import type { PickBy, ReactiveValue, ReplaceKey } from '#/types.js';
import { isString } from '#/utils/type-guards.js';
import type { LocalizableText } from './localizable-text.model.js';
import { LocalizationService } from './localization.service.js';

export type DynamicText = ReactiveValue<LocalizableText>;

export const missingLocalizationKeyText = '[MISSING LOCALIZATION KEY]';

export function resolveDynamicText(text: DynamicText, localizationService: LocalizationService = inject(LocalizationService)): Signal<string> {
  const localizableTextSignal =
    isSignal(text) ? text
      : isObservable(text) ? untracked(() => toSignal(text.pipe(runInUntracked()), { initialValue: missingLocalizationKeyText }))
        : computed(() => text);

  return switchMap(() => {
    const localizableText = localizableTextSignal();
    return isString(localizableText) ? computed(() => localizableText) : localizationService.localize(localizableText);
  });
}

export function resolveDynamicText$(text: DynamicText, localizationService?: LocalizationService): Observable<string> {
  return toObservable(resolveDynamicText(text, localizationService));
}

export function resolveDynamicTexts(texts: DynamicText[], localizationService?: LocalizationService): Signal<string[]> {
  const signals = texts.map((text) => resolveDynamicText(text, localizationService));
  return computed(() => signals.map((s) => s()));
}

export function resolveDynamicTexts$(texts: DynamicText[], localizationService?: LocalizationService): Observable<string[]> {
  return toObservable(resolveDynamicTexts(texts, localizationService));
}

export function resolveNestedDynamicText<T, K extends keyof PickBy<T, DynamicText>>(item: T, key: K, localizationService?: LocalizationService): Signal<ReplaceKey<T, K, string>> {
  const result = resolveDynamicText(item[key] as DynamicText, localizationService);
  return computed(() => ({ ...item, [key]: result() }) as ReplaceKey<T, K, string>);
}

export function resolveNestedDynamicText$<T, K extends keyof PickBy<T, DynamicText>>(item: T, key: K, localizationService?: LocalizationService): Observable<ReplaceKey<T, K, string>> {
  return toObservable(resolveNestedDynamicText(item, key, localizationService));
}

export function resolveNestedDynamicTexts<T, K extends keyof PickBy<T, DynamicText>>(items: T[], key: K, localizationService?: LocalizationService): Signal<ReplaceKey<T, K, string>[]> {
  const itemSignals = items.map((item) => resolveNestedDynamicText(item, key, localizationService));
  return computed(() => itemSignals.map((s) => s()));
}

export function resolveNestedDynamicTexts$<T, K extends keyof PickBy<T, DynamicText>>(items: T[], key: K, localizationService?: LocalizationService): Observable<ReplaceKey<T, K, string>[]> {
  return toObservable(resolveNestedDynamicTexts(items, key, localizationService));
}
