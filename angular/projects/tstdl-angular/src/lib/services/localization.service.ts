import { Injectable } from '@angular/core';
import { Enumerable } from '@tstdl/base/enumerable';
import { isFunction, isUndefined } from '@tstdl/base/esm/utils';
import type { StringMap } from '@tstdl/base/types';
import type { Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';

export type Language = {
  code: string,
  name: string
};

export type LocalizeFunction = (parameters: StringMap) => string;

export type Localization<T extends StringMap<string | LocalizeFunction> = StringMap<string | LocalizeFunction>> = {
  language: Language,
  keys: T
};

type MappedLocalization = {
  language: Language,
  keys: Map<string, string | LocalizeFunction>
};

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

  localize(key: string, parameters: StringMap = {}): string {
    if (this.language == undefined) {
      throw new Error('language not set');
    }

    const localization = this.localizations.get(this.language.code);

    if (localization == undefined) {
      return `__${key}__`;
    }

    let textOrFunction = localization.keys.get(key);

    if (textOrFunction == undefined) {
      return `__${key}__`;
    }

    if (isFunction(textOrFunction)) {
      return textOrFunction(parameters);
    }

    for (const [parameter, value] of Object.entries(parameters)) {
      const regex = new RegExp(`\\{\\{\\s*${parameter}\\s*\\}\\}`, 'gui');
      textOrFunction = textOrFunction.replace(regex, value as string);
    }

    return textOrFunction;
  }

  localize$(key: string, parameters: StringMap<string | number> = {}): Observable<string> {
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
