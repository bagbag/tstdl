import { singleton } from '#/container';
import type { Record } from '#/types';
import { deepEntries } from '#/utils/object/object';
import type { PropertyName } from '#/utils/object/property-name';
import { getPropertyNameProxy, isPropertyName, propertyName } from '#/utils/object/property-name';
import { assertDefinedPass, isDefined, isFunction, isNotNull, isObject, isString, isUndefined } from '#/utils/type-guards';
import type { Observable } from 'rxjs';
import { BehaviorSubject, map } from 'rxjs';

export type Language = {
  code: string,
  name: string
};

export type LocalizeFunction<Parameters = void> = (parameters: Parameters) => string;

export type LocalizeItem<Parameters = void> = string | LocalizeFunction<Parameters>;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type LocalizationTemplate = { [key: string]: LocalizeItem<any> | LocalizationTemplate };

export type Localization<T extends LocalizationTemplate = LocalizationTemplate> = {
  language: Language,
  keys: T
};

declare const parametersSymbol: unique symbol;

export type LocalizationKey<Parameters = void> = PropertyName & { [parametersSymbol]: Parameters };

export type LocalizationData<Parameters = any> =
  | LocalizationKey
  | { key: LocalizationKey, parameters?: void }
  | LocalizationDataObject<Parameters>;

export type LocalizationDataObject<Parameters> = {
  key: LocalizationKey<Parameters>,
  parameters: Parameters
};

export type LocalizationKeys<T extends LocalizationTemplate> = {
  [P in keyof T]: T[P] extends LocalizationTemplate
  ? LocalizationKeys<T[P]>
  : T[P] extends LocalizeItem<infer R>
  ? LocalizationKey<R>
  : LocalizationKey;
};

export function isLocalizationKey(value: any): value is LocalizationKey {
  return isPropertyName(value);
}

export function getLocalizationKey<Parameters = void>(key: string): LocalizationKey<Parameters> {
  return { [propertyName]: key } as LocalizationKey<Parameters>;
}

/** helper function to ensure type safety */
export function localizationData<T>(data: LocalizationData<T>): LocalizationData<T> {
  return data;
}

/**
 * returns a Proxy which simply returns the key you accessed. Can be used to have typesafe localizations (in templates and the API) by not relying on plain strings
 * @param localization
 * @returns
 */
export function getLocalizationKeys<T extends Localization>(_localization?: T): LocalizationKeys<T['keys']> {
  return getPropertyNameProxy() as unknown as LocalizationKeys<T['keys']>;
}

type MappedLocalization = {
  language: Language,
  keys: Map<string, string | LocalizeFunction<unknown>>
};

const parametersPattern = /(?:\{\{\s*(?<parameter>\w+)\s*\}\})/ug;

@singleton()
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

  registerLocalization(...localizations: Localization[]): void {
    for (const localization of localizations) {
      if (this.localizations.has(localization.language.code)) {
        throw new Error(`Localization ${localization.language.name} (${localization.language.code}) already registered.`);
      }

      const mappedLocalization = buildMappedLocalization(localization);
      this.localizations.set(localization.language.code, mappedLocalization);

      if (isUndefined(this.activeLanguage)) {
        this.setLocalization(localization);
      }

      const availableLanguages = [...this.localizations].map(([, loc]) => loc.language);
      this.availableLanguagesSubject.next(availableLanguages);
    }
  }

  hasLanguage(languageCode: string): boolean {
    return this.localizations.has(languageCode);
  }

  getLanguage(languageCode: string): Language {
    return assertDefinedPass(this.localizations.get(languageCode), 'language not available').language;
  }

  setLanguage(languageOrCode: Language | string): void {
    const language = isString(languageOrCode) ? this.localizations.get(languageOrCode)?.language : languageOrCode;

    if (isUndefined(language) || !this.localizations.has(language.code)) {
      throw new Error('Language not registered.');
    }

    this.activeLanguageSubject.next(language);
  }

  setLocalization(localization: Localization): void {
    this.setLanguage(localization.language);
  }

  tryGetItem<Parameters>(key: LocalizationKey<Parameters> | LocalizationData<Parameters>): LocalizeItem | undefined {
    if (isUndefined(this.activeLanguage)) {
      return undefined;
    }

    const keyIsLocalizationKey = isLocalizationKey(key);
    const actualKey = keyIsLocalizationKey ? key[propertyName] : (key as LocalizationDataObject<unknown>).key[propertyName];
    return this.localizations.get(this.activeLanguage.code)?.keys.get(actualKey);
  }

  hasKey<Parameters>(key: LocalizationKey<Parameters> | LocalizationData<Parameters>): boolean {
    const item = this.tryGetItem(key);
    return isDefined(item);
  }

  // eslint-disable-next-line max-statements
  localize<Parameters>(data: LocalizationKey<Parameters> | LocalizationData<Parameters>): string {
    if (isUndefined(this.activeLanguage)) {
      throw new Error('Language not set.');
    }

    const dataIsLocalizationKey = isLocalizationKey(data);
    const key = dataIsLocalizationKey ? data[propertyName] : (data as LocalizationDataObject<unknown>).key[propertyName];
    const parameters = dataIsLocalizationKey ? {} : (data as LocalizationDataObject<unknown>).parameters;

    const templateOrFunction = this.localizations.get(this.activeLanguage.code)?.keys.get(key);

    if (isUndefined(templateOrFunction)) {
      return `__${key}__`;
    }

    if (isFunction(templateOrFunction)) {
      return templateOrFunction(parameters);
    }

    const template = templateOrFunction;
    const templateParameters = ((isNotNull(parameters) && isObject(parameters)) ? parameters : {}) as Record<string>;
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

  localize$<Parameters>(data: LocalizationData<Parameters>): Observable<string> {
    return this.activeLanguage$.pipe(map(() => this.localize(data)));
  }
}

function buildMappedLocalization({ language, keys }: Localization): MappedLocalization {
  const mappedLocalization: MappedLocalization = {
    language,
    keys: new Map(deepEntries(keys))
  };

  return mappedLocalization;
}
