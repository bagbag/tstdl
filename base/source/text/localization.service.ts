import { resolveArg, singleton } from '#/container/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { Enumeration, EnumerationArray, EnumerationObject, EnumerationValue, Record } from '#/types.js';
import { enumEntries, enumValueName } from '#/utils/enum.js';
import { memoizeSingle } from '#/utils/function/memoize.js';
import { deepObjectEntries } from '#/utils/object/object.js';
import type { PropertyName } from '#/utils/object/property-name.js';
import { getPropertyNameProxy, isPropertyName, propertyName } from '#/utils/object/property-name.js';
import { assertDefinedPass, isArray, isDefined, isFunction, isNotNull, isObject, isString, isUndefined } from '#/utils/type-guards.js';
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

export type EnumerationLocalization<T extends Enumeration = Enumeration> = { [P in EnumerationValue<T>]: LocalizeItem<any> };

export type EnumerationLocalizationEntry<T extends Enumeration = Enumeration> = [T, EnumerationLocalization<T>];

export type Localization<T extends LocalizationTemplate = LocalizationTemplate, Enums extends Enumeration[] = []> = {
  language: Language,
  keys: T,
  enums: { [P in keyof Enums]: EnumerationLocalizationEntry<Enums[P]> }
};

declare const parametersSymbol: unique symbol;

export type ProxyLocalizationKey<Parameters = void> = PropertyName & { [parametersSymbol]?: Parameters };
export type LocalizationKey<Parameters = void> = string | ProxyLocalizationKey<Parameters>;

export type LocalizationData<Parameters = any> =
  | LocalizationKey
  | LocalizationDataObject<Parameters>
  | { key: LocalizationKey, parameters?: void };

export type LocalizationDataObject<Parameters> = {
  key: LocalizationKey<Parameters>,
  parameters: Parameters
};

export type ProxyLocalizationKeys<T extends LocalizationTemplate> = {
  [P in keyof T]: T[P] extends LocalizationTemplate
  ? ProxyLocalizationKeys<T[P]>
  : T[P] extends LocalizeItem<infer R>
  ? ProxyLocalizationKey<R>
  : ProxyLocalizationKey;
};

type MappedLocalization = {
  language: Language,
  keys: Map<string, string | LocalizeFunction<unknown>>,
  enums: Map<Enumeration, EnumerationLocalization>
};

export function isProxyLocalizationKey(value: any): value is ProxyLocalizationKey {
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
export function getLocalizationKeys<T extends Localization<any, any>>(_localization?: T): ProxyLocalizationKeys<T['keys']> {
  return getPropertyNameProxy() as unknown as ProxyLocalizationKeys<T['keys']>;
}

export const autoEnumerationLocalization = memoizeSingle(_autoEnumerationLocalization, { weak: true });

const parametersPattern = /(?:\{\{\s*(?<parameter>\w+)\s*\}\})/ug;
const warnedMissingKeys = new Set<string>();

@singleton()
export class LocalizationService {
  private readonly logger: Logger;
  private readonly localizations: Map<string, MappedLocalization>;
  private readonly activeLanguageSubject: BehaviorSubject<Language | undefined>;
  private readonly availableLanguagesSubject: BehaviorSubject<Language[]>;

  private get activeLocalization(): MappedLocalization | undefined {
    if (isUndefined(this.activeLanguage)) {
      return undefined;
    }

    return this.localizations.get(this.activeLanguage.code);
  }

  get availableLanguages(): readonly Language[] {
    return this.availableLanguagesSubject.value;
  }

  get activeLanguage(): Language | undefined {
    return this.activeLanguageSubject.value;
  }

  readonly activeLanguage$: Observable<Language | undefined>;
  readonly availableLanguages$: Observable<readonly Language[]>;

  constructor(@resolveArg<LoggerArgument>('LocalizationService') logger: Logger) {
    this.logger = logger;

    this.localizations = new Map();
    this.activeLanguageSubject = new BehaviorSubject<Language | undefined>(undefined);
    this.availableLanguagesSubject = new BehaviorSubject<Language[]>([]);

    this.activeLanguage$ = this.activeLanguageSubject.asObservable();
    this.availableLanguages$ = this.availableLanguagesSubject.asObservable();
  }

  registerLocalization(...localizations: Localization<any, any>[]): void {
    for (const localization of localizations) {
      const mappedLocalization = buildMappedLocalization(localization);

      if (this.localizations.has(localization.language.code)) {
        const existing = this.localizations.get(localization.language.code)!;
        const merged = mergeMappedLocalization(existing, mappedLocalization);
        this.localizations.set(localization.language.code, merged);
      }
      else {
        this.localizations.set(localization.language.code, mappedLocalization);
      }

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

  setLocalization(localization: Localization<any, any>): void {
    this.setLanguage(localization.language);
  }

  tryGetItem<Parameters>(key: LocalizationKey<Parameters> | LocalizationData<Parameters>): LocalizeItem | undefined {
    if (isUndefined(this.activeLanguage)) {
      return undefined;
    }

    const actualKey = getStringKey(key);
    return this.localizations.get(this.activeLanguage.code)?.keys.get(actualKey);
  }

  hasKey<Parameters>(key: LocalizationKey<Parameters> | LocalizationData<Parameters>): boolean {
    const item = this.tryGetItem(key);
    return isDefined(item);
  }

  // eslint-disable-next-line max-statements
  localize<Parameters>(keyOrData: LocalizationKey<Parameters> | LocalizationData<Parameters>): string {
    const key = getStringKey(keyOrData);
    const parameters = (isString(keyOrData) || isProxyLocalizationKey(keyOrData)) ? {} : (keyOrData as LocalizationDataObject<unknown>).parameters;

    const templateOrFunction = isDefined(this.activeLanguage) ? this.localizations.get(this.activeLanguage.code)?.keys.get(key) : undefined;

    if (isUndefined(templateOrFunction)) {
      if (!warnedMissingKeys.has(key)) {
        this.logger.warn(`Localization for ${key} not available.`);
        warnedMissingKeys.add(key);
      }
    }

    return this.localizeItem(key, templateOrFunction, parameters);
  }

  localizeEnum<T extends Enumeration>(enumeration: T, value: EnumerationValue<T>, parameters?: unknown): string {
    const key = isArray(enumeration) ? value : enumValueName(enumeration, value);
    const item = this.activeLocalization?.enums.get(enumeration)?.[value];

    if (isUndefined(item)) {
      return autoEnumerationLocalization(enumeration)[1][value] as string;
    }

    return this.localizeItem(key, item, parameters);
  }

  localize$<Parameters>(data: LocalizationData<Parameters>): Observable<string> {
    return this.activeLanguage$.pipe(map(() => this.localize(data)));
  }

  localizeEnum$<T extends Enumeration>(enumeration: T, value: EnumerationValue<T>, parameters?: unknown): Observable<string> {
    return this.activeLanguage$.pipe(map(() => this.localizeEnum(enumeration, value, parameters)));
  }

  private localizeItem(key: string | number, templateOrFunction: string | LocalizeFunction<any> | undefined, parameters: unknown): string {
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
      currentIndex = index! + match.length;
    }

    result += template.slice(currentIndex);
    return result;
  }
}

export function enumerationLocalization<T extends Enumeration>(enumeration: T, localization: EnumerationLocalization<T>): EnumerationLocalizationEntry<T> {
  return [enumeration, localization];
}

function _autoEnumerationLocalization<T extends Enumeration>(enumeration: T): EnumerationLocalizationEntry<T> {
  if (isObject(enumeration)) {
    return [enumeration, Object.fromEntries(enumEntries(enumeration as EnumerationObject).map(([key, value]) => [value, key])) as EnumerationLocalization<T>];
  }

  const arrayEntries = (enumeration as EnumerationArray).map((value) => [value, value] as const);
  return [enumeration, Object.fromEntries(arrayEntries) as EnumerationLocalization<T>];
}

function buildMappedLocalization({ language, keys, enums }: Localization): MappedLocalization {
  const mappedLocalization: MappedLocalization = {
    language,
    keys: new Map(deepObjectEntries(keys)),
    enums: new Map(enums)
  };

  return mappedLocalization;
}

function getStringKey(key: string | LocalizationKey<any> | LocalizationData): string {
  return isProxyLocalizationKey(key) ? key[propertyName]
    : isString(key) ? key
      : getStringKey((key as LocalizationDataObject<unknown>).key);
}

function mergeMappedLocalization(a: MappedLocalization, b: MappedLocalization, force: boolean = false): MappedLocalization {
  if (!force && (a.language.code != b.language.code)) {
    throw new Error('Language code mismatch. Set force to true to force.');
  }

  return {
    language: b.language,
    keys: new Map([...a.keys, ...b.keys]),
    enums: new Map([...a.enums, ...b.enums])
  };
}
