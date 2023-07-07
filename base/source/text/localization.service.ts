import type { Observable } from 'rxjs';

import { resolveArg, singleton } from '#/container/index.js';
import { DetailsError } from '#/error/details.error.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { Signal } from '#/signals/api.js';
import { computed, signal, toObservable } from '#/signals/api.js';
import type { Enumeration, EnumerationArray, EnumerationObject, EnumerationValue, Record } from '#/types.js';
import { enumEntries, enumValueName } from '#/utils/enum.js';
import { memoize } from '#/utils/function/memoize.js';
import { deepObjectEntries, hasOwnProperty } from '#/utils/object/object.js';
import type { PropertyName } from '#/utils/object/property-name.js';
import { getPropertyName, getPropertyNameProxy, isPropertyName, propertyName } from '#/utils/object/property-name.js';
import { assertDefinedPass, isArray, isDefined, isFunction, isNotNull, isNull, isNullOrUndefined, isObject, isString, isUndefined } from '#/utils/type-guards.js';

export type Language = {
  code: string,
  name: string
};

export type LocalizeFunction<Parameters = void> = (parameters: Parameters) => string;

export type LocalizeItem<Parameters = void> = string | LocalizeFunction<Parameters>;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type LocalizationTemplate = { [key: string]: LocalizeItem<any> | LocalizationTemplate };

export type EnumerationLocalization<T extends Enumeration = Enumeration> = { [P in EnumerationValue<T>]: LocalizeItem<any> };

export type EnumerationLocalizationEntry<T extends Enumeration = Enumeration> = [enumType: T, enumName: LocalizeItem<any> | undefined, enumValues: EnumerationLocalization<T>];

export type Localization<T extends LocalizationTemplate = LocalizationTemplate, Enums extends Enumeration[] = Enumeration[]> = {
  language: Language,
  keys: T,
  enums: { [I in keyof Enums]: EnumerationLocalizationEntry<Enums[I]> }
};

declare const parametersSymbol: unique symbol;

export type ProxyLocalizationKey<Parameters = void> = PropertyName & { [parametersSymbol]?: Parameters };
export type LocalizationKey<Parameters = void> = string | ProxyLocalizationKey<Parameters>;
export type EnumLocalizationKey<T extends Enumeration = Enumeration, Parameters = void> = Parameters extends void
  ? { enum: T, value?: EnumerationValue<T>, parameters?: void }
  : { enum: T, value?: EnumerationValue<T>, parameters: Parameters };

export type LocalizationData<Parameters = any, E extends Enumeration = any> =
  | LocalizationKey
  | EnumLocalizationKey<E, Parameters>
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

type MappedEnumerationLocalizationEntry = {
  name: LocalizeItem | undefined,
  values: EnumerationLocalization
};

type MappedLocalization = {
  language: Language,
  keys: Map<string, string | LocalizeFunction<unknown>>,
  enums: Map<Enumeration, MappedEnumerationLocalizationEntry>
};

export function getProxyLocalizationKey<Parameters = void>(key: string): ProxyLocalizationKey<Parameters> {
  return getPropertyName(key);
}

export function isProxyLocalizationKey(value: any): value is ProxyLocalizationKey {
  return isPropertyName(value);
}

export function isEnumLocalizationKey(key: any): key is EnumLocalizationKey {
  return isObject(key) && hasOwnProperty((key as EnumLocalizationKey), 'enum');
}

export function isLocalizationDataObject(value: LocalizationData): value is LocalizationDataObject<any> {
  return isObject(value) && hasOwnProperty((value as LocalizationDataObject<any>), 'key');
}

/** helper function to ensure type safety */
export function localizationData<T>(key: LocalizationKey<T>, parameters: T): LocalizationDataObject<T>;
export function localizationData<T>(data: LocalizationData<T>): LocalizationDataObject<T>;
export function localizationData<T>(keyOrData: LocalizationKey<T> | LocalizationData<T>, parameters?: T): LocalizationData<T> {
  if (isString(keyOrData) || isProxyLocalizationKey(keyOrData)) {
    return { key: keyOrData, parameters } as LocalizationDataObject<T>;
  }

  return keyOrData as LocalizationData<T>;
}

/**
 * returns a Proxy which simply returns the key you accessed. Can be used to have typesafe localizations (in templates and the API) by not relying on plain strings
 * @param localization
 * @returns
 */
export function getLocalizationKeys<T extends Localization>(_localization?: T): ProxyLocalizationKeys<T['keys']> {
  return getPropertyNameProxy() as unknown as ProxyLocalizationKeys<T['keys']>;
}

export const autoEnumerationLocalization = memoize(_autoEnumerationLocalization);

const parametersPattern = /(?:\{\{\s*(?<parameter>\w+)\s*\}\})/ug;
const warnedMissingKeys = new Set<string>();

@singleton()
export class LocalizationService {
  readonly #logger: Logger;
  readonly #localizations = new Map<string, MappedLocalization>();
  readonly #activeLanguage = signal<Language | null>(null);
  readonly #availableLanguages = signal<Language[]>([]);

  readonly #activeLocalization = computed(() => {
    const language = this.#activeLanguage();

    if (isNull(language)) {
      return null;
    }

    return this.#localizations.get(language.code);
  });

  readonly activeLanguage = this.#activeLanguage.asReadonly();
  readonly availableLanguages = this.#availableLanguages.asReadonly();

  readonly activeLanguage$ = toObservable(this.activeLanguage);
  readonly availableLanguages$ = toObservable(this.availableLanguages);

  constructor(@resolveArg<LoggerArgument>('LocalizationService') logger: Logger) {
    this.#logger = logger;
  }

  registerLocalization(...localizations: Localization[]): void {
    for (const localization of localizations) {
      const mappedLocalization = buildMappedLocalization(localization);

      if (this.#localizations.has(localization.language.code)) {
        const existing = this.#localizations.get(localization.language.code)!;
        const merged = mergeMappedLocalization(existing, mappedLocalization);
        this.#localizations.set(localization.language.code, merged);
      }
      else {
        this.#localizations.set(localization.language.code, mappedLocalization);
      }

      const availableLanguages = [...this.#localizations].map(([, loc]) => loc.language);
      this.#availableLanguages.set(availableLanguages);

      if (isNullOrUndefined(this.#activeLanguage())) {
        this.setLanguage(localization.language.code);
      }
    }
  }

  hasLanguage(languageCode: string): boolean {
    return this.#localizations.has(languageCode);
  }

  getLanguage(languageCode: string): Language {
    return assertDefinedPass(this.#localizations.get(languageCode), 'language not available').language;
  }

  setLanguage(languageOrCode: Language | string): void {
    const language = isString(languageOrCode) ? this.#localizations.get(languageOrCode)?.language : languageOrCode;

    if (isUndefined(language) || !this.#localizations.has(language.code)) {
      throw new Error('Language not registered.');
    }

    this.#activeLanguage.set(language);
  }

  setLocalization(localization: Localization): void {
    this.setLanguage(localization.language.code);
  }

  tryGetItem<Parameters>(keyOrData: LocalizationKey<Parameters> | LocalizationData<Parameters>): LocalizeItem | undefined {
    const activeLanguageCode = this.#activeLanguage()?.code;

    if (isUndefined(activeLanguageCode)) {
      return undefined;
    }

    if (isEnumLocalizationKey(keyOrData)) {
      const enumEntry = this.#localizations.get(activeLanguageCode)?.enums.get(keyOrData.enum);
      return isDefined(keyOrData.value) ? enumEntry?.values[keyOrData.value] : enumEntry?.name;
    }

    const actualKey = getStringKey(keyOrData);
    return this.#localizations.get(activeLanguageCode)?.keys.get(actualKey);
  }

  hasKey<Parameters>(key: LocalizationKey<Parameters> | LocalizationData<Parameters>): boolean {
    const item = this.tryGetItem(key);
    return isDefined(item);
  }

  // eslint-disable-next-line max-statements
  localizeOnce<Parameters = void>(keyOrData: LocalizationKey<Parameters> | LocalizationData<Parameters>): string {
    if (isEnumLocalizationKey(keyOrData)) {
      return this.localizeEnumOnce(keyOrData.enum, keyOrData.value, keyOrData.parameters);
    }

    const key = getStringKey(keyOrData);
    const parameters = (isString(keyOrData) || isProxyLocalizationKey(keyOrData)) ? {} : (keyOrData as LocalizationDataObject<unknown>).parameters;

    const activeLanguageCode = this.#activeLanguage()?.code;
    const templateOrFunction = isDefined(activeLanguageCode) ? this.#localizations.get(activeLanguageCode)?.keys.get(key) : undefined;

    if (isUndefined(templateOrFunction)) {
      if (!warnedMissingKeys.has(key)) {
        this.#logger.warn(`Localization for ${key} not available.`);
        warnedMissingKeys.add(key);
      }
    }

    return this.localizeItem(key, templateOrFunction, parameters);
  }

  localizeEnumOnce<T extends Enumeration>(enumeration: T, value?: EnumerationValue<T>, parameters?: unknown): string {
    if (isUndefined(value)) {
      const name = this.#activeLocalization()?.enums.get(enumeration)?.name;
      return this.localizeItem('ENUM', name, parameters);
    }

    const key = isArray(enumeration) ? value : enumValueName(enumeration, value);
    const item = this.#activeLocalization()?.enums.get(enumeration)?.values[value];

    if (isUndefined(item)) {
      return autoEnumerationLocalization(enumeration)[2][value] as string;
    }

    return this.localizeItem(key, item, parameters);
  }

  localize<Parameters>(data: LocalizationData<Parameters>): Signal<string> {
    return computed(() => this.localizeOnce(data));
  }

  localizeEnum<T extends Enumeration>(enumeration: T, value?: EnumerationValue<T>, parameters?: unknown): Signal<string> {
    return computed(() => this.localizeEnumOnce(enumeration, value, parameters));
  }

  localize$<Parameters>(data: LocalizationData<Parameters>): Observable<string> {
    return toObservable(this.localize(data));
  }

  localizeEnum$<T extends Enumeration>(enumeration: T, value?: EnumerationValue<T>, parameters?: unknown): Observable<string> {
    return toObservable(this.localizeEnum(enumeration, value, parameters));
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

export function enumerationLocalization<T extends Enumeration>(enumeration: T, name: LocalizeItem | undefined, localization: EnumerationLocalization<T>): EnumerationLocalizationEntry<T>;
export function enumerationLocalization<T extends Enumeration>(enumeration: T, localization: EnumerationLocalization<T>): EnumerationLocalizationEntry<T>;
export function enumerationLocalization<T extends Enumeration>(enumeration: T, nameOrLocalization: LocalizeItem | EnumerationLocalization<T> | undefined, localizationOrNothing?: EnumerationLocalization<T>): EnumerationLocalizationEntry<T> {
  return [enumeration, isLocalizeItem(nameOrLocalization) ? nameOrLocalization : undefined, localizationOrNothing ?? nameOrLocalization as EnumerationLocalization<T>];
}

function _autoEnumerationLocalization<T extends Enumeration>(enumeration: T, name?: LocalizeItem): EnumerationLocalizationEntry<T> {
  if (isObject(enumeration)) {
    return [enumeration, name, Object.fromEntries(enumEntries(enumeration as EnumerationObject).map(([key, value]) => [value, key])) as EnumerationLocalization<T>];
  }

  const arrayEntries = (enumeration as EnumerationArray).map((value) => [value, value] as const);
  return [enumeration, name, Object.fromEntries(arrayEntries) as EnumerationLocalization<T>];
}

function buildMappedLocalization({ language, keys, enums }: Localization): MappedLocalization {
  const enumsEntries = enums.map((entry) => [entry[0], { name: entry[1], values: entry[2] }] as const);

  const mappedLocalization: MappedLocalization = {
    language,
    keys: new Map(deepObjectEntries(keys)),
    enums: new Map(enumsEntries)
  };

  return mappedLocalization;
}

function getStringKey(key: string | LocalizationKey<any> | LocalizationData, sourceKey: any = key): string {
  if (isProxyLocalizationKey(key)) {
    return key[propertyName];
  }

  if (isString(key)) {
    return key;
  }

  if (isNullOrUndefined(key)) {
    throw new DetailsError('Invalid localization key', { sourceKey });
  }

  return getStringKey((key as LocalizationDataObject<unknown>).key, sourceKey);
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

export function isLocalizeItem(value: any): value is LocalizeItem<any> {
  return isString(value) || isFunction(value);
}
