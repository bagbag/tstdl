import { Injectable } from '@angular/core';
import { Enumerable } from '@tstdl/base/cjs/enumerable';
import type { StringMap } from '@tstdl/base/cjs/types';
import type { PropertyName } from '@tstdl/base/cjs/utils';
import { assertDefinedPass, deepEntries, getPropertyNameProxy, isFunction, isNotNull, isObject, isString, isUndefined, propertyName } from '@tstdl/base/cjs/utils';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export type Language = {
  code: string,
  name: string
};

export type LocalizeFunction<T = any> = (parameter: T) => string;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type LocalizationTemplate = { [key: string]: string | LocalizeFunction | LocalizationTemplate };

export type Localization<T extends LocalizationTemplate = LocalizationTemplate> = {
  language: Language,
  keys: T
};

export type LocalizationKeys<T extends LocalizationTemplate> = {
  [P in keyof T]: T[P] extends LocalizationTemplate ? LocalizationKeys<T[P]> : PropertyName;
};

/**
 * returns a Proxy which simply returns the key you accessed. Can be used to have typesafe localizations (in templates and the API) by not relying on plain strings
 * @param localization
 * @returns
 */
export function getLocalizationKeys<T extends Localization>(_localization?: T): LocalizationKeys<T['keys']> {
  return getPropertyNameProxy();
}

type MappedLocalization = {
  language: Language,
  keys: Map<string, string | LocalizeFunction>
};

const parametersPattern = /(?:\{\{\s*(?<parameter>\w+)\s*\}\})/ug;

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  private readonly localizations: Map<string, MappedLocalization>;
  private readonly activeLanguageSubject: BehaviorSubject<Language | undefined>;
  private readonly availableLanguagesSubject: BehaviorSubject<Language[]>;

  get availableLanguages(): readonly Language[] {
    return this.availableLanguagesSubject.value;
  }

  get activeLanguage(): Language | undefined {
    return this.activeLanguageSubject.value;
  }

  readonly activeLanguage$: Observable<Language | undefined>;
  readonly availableLanguages$: Observable<readonly Language[]>;

  constructor() {
    this.localizations = new Map();
    this.activeLanguageSubject = new BehaviorSubject<Language | undefined>(undefined);
    this.availableLanguagesSubject = new BehaviorSubject<Language[]>([]);

    this.activeLanguage$ = this.activeLanguageSubject.asObservable();
    this.availableLanguages$ = this.availableLanguagesSubject.asObservable();
  }

  registerLocalization(localization: Localization): void {
    if (this.localizations.has(localization.language.code)) {
      throw new Error(`language ${localization.language.name} (${localization.language.code}) already registered`);
    }

    const mappedLocalization = buildMappedLocalization(localization);
    this.localizations.set(localization.language.code, mappedLocalization);

    if (isUndefined(this.activeLanguage)) {
      this.setLocalization(localization);
    }

    const availableLanguages = Enumerable.from(this.localizations).map(([, loc]) => loc.language).toArray();
    this.availableLanguagesSubject.next(availableLanguages);
  }

  hasLanguage(languageCode: string): boolean {
    return this.localizations.has(languageCode);
  }

  getLanguage(languageCode: string): Language {
    return assertDefinedPass(this.localizations.get(languageCode), 'language not available').language;
  }

  setLanguage(language: Language): void {
    const has = this.localizations.has(language.code);

    if (!has) {
      throw new Error(`language ${language.code} (${language.name}) not registered`);
    }

    this.activeLanguageSubject.next(language);
  }

  setLocalization(localization: Localization): void {
    this.setLanguage(localization.language);
  }

  // eslint-disable-next-line max-statements
  localize(keyOrPropertyName: string | PropertyName, parameter?: any): string {
    if (isUndefined(this.activeLanguage)) {
      throw new Error('language not set');
    }

    const key = isString(keyOrPropertyName) ? keyOrPropertyName : keyOrPropertyName[propertyName];

    const localization = this.localizations.get(this.activeLanguage.code);

    if (isUndefined(localization)) {
      return `__${key}__`;
    }

    const templateOrFunction = localization.keys.get(key);

    if (isUndefined(templateOrFunction)) {
      return `__${key}__`;
    }

    if (isFunction(templateOrFunction)) {
      return templateOrFunction(parameter);
    }

    const template = templateOrFunction;
    const templateParameters = ((isNotNull(parameter) && isObject(parameter)) ? parameter : {}) as StringMap;
    const matches = template.matchAll(parametersPattern);

    let currentIndex = 0;
    let result = '';

    for (const { 0: match, index, groups } of matches) {
      const parameterName = groups!['parameter']!;

      result += template.slice(currentIndex, index);
      result += templateParameters[parameterName] ?? `__${parameterName}__`;
      currentIndex = index! + match!.length;
    }

    result += template.slice(currentIndex);
    return result;
  }

  localize$(key: string, parameter?: any): Observable<string> {
    return this.activeLanguage$.pipe(map(() => this.localize(key, parameter)));
  }
}

function buildMappedLocalization({ language, keys }: Localization): MappedLocalization {
  const mappedLocalization: MappedLocalization = {
    language,
    keys: new Map(deepEntries(keys))
  };

  return mappedLocalization;
}
