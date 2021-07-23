import { Injectable } from '@angular/core';
import { Enumerable } from '@tstdl/base/enumerable';
import { isFunction, isNotNull, isObject, isUndefined } from '@tstdl/base/esm/utils';
import type { StringMap } from '@tstdl/base/types';
import type { Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';

export type Language = {
  code: string,
  name: string
};

export type LocalizeFunction<T = any> = (parameter: T) => string;

export type Localization<T extends StringMap<string | LocalizeFunction> = StringMap<string | LocalizeFunction>> = {
  language: Language,
  keys: { [P in keyof T]: string | LocalizeFunction }
};

export type LocalizationKeys<T extends Localization> = {
  [P in keyof T['keys']]: P;
};

/**
 * returns a Proxy which simply returns the key you accessed. Can be used to have typesafe localizations (in templates and the API) by not relying on plain strings
 * @param localization
 * @returns
 */
export function getLocalizationKeys<T extends Localization>(localization?: T): LocalizationKeys<NonNullable<typeof localization>> {
  return new Proxy({} as LocalizationKeys<T>, {
    get: (_, property) => property
  });
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
  private readonly languageSubject: ReplaySubject<Language>;

  private language: Language | undefined;

  get activeLanguage(): Language | undefined {
    return this.language;
  }

  get activeLanguage$(): Observable<Language> {
    return this.languageSubject.asObservable();
  }

  get availableLanguages(): Iterable<Language> {
    return Enumerable.from(this.localizations).map(([, localization]) => localization.language);
  }

  constructor() {
    this.localizations = new Map();
    this.languageSubject = new ReplaySubject(1);
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
  }

  setLanguage(language: Language): void {
    const has = this.localizations.has(language.code);

    if (!has) {
      throw new Error(`language ${language.code} (${language.name}) not registered`);
    }

    this.language = language;
    this.languageSubject.next(language);
  }

  setLocalization(localization: Localization): void {
    this.setLanguage(localization.language);
  }

  // eslint-disable-next-line max-statements
  localize(key: string, parameters: any = {}): string {
    if (this.language == undefined) {
      throw new Error('language not set');
    }

    const localization = this.localizations.get(this.language.code);

    if (localization == undefined) {
      return `__${key}__`;
    }

    const templateOrFunction = localization.keys.get(key);

    if (templateOrFunction == undefined) {
      return `__${key}__`;
    }

    if (isFunction(templateOrFunction)) {
      return templateOrFunction(parameters);
    }

    const template = templateOrFunction;
    const templateParameters = ((isNotNull(parameters) && isObject(parameters)) ? parameters : {}) as StringMap;
    const matches = template.matchAll(parametersPattern);

    let currentIndex = 0;
    let result = '';

    for (const { 0: match, index, groups } of matches) {
      const parameter = groups!['parameter']!;

      result += template.slice(currentIndex, index);
      result += templateParameters[parameter] ?? `__${parameter}__`;
      currentIndex = index! + match!.length;
    }

    result += template.slice(currentIndex);
    return result;
  }

  localize$(key: string, parameters: any = {}): Observable<string> {
    return this.activeLanguage$.pipe(map(() => this.localize(key, parameters)));
  }
}

function buildMappedLocalization({ language, keys }: Localization): MappedLocalization {
  const mappedLocalization: MappedLocalization = {
    language,
    keys: new Map(Object.entries(keys))
  };

  return mappedLocalization;
}
