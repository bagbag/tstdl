import { Injectable } from '@angular/core';
import { Enumerable } from '@tstdl/base/enumerable';
import { StringMap } from '@tstdl/base/types';
import { Observable, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';

export type Language = {
  code: string,
  name: string
};

export type Localization<T extends StringMap<string> = StringMap<string>> = {
  language: Language,
  keys: T
};

type MappedLocalization = {
  language: Language,
  keys: Map<string, string>
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

    if (this.activeLanguage == undefined) {
      this.setLocalization(localization);
    }
  }

  setLanguage(language: Language): void {
    const has = this.localizations.has(language.code);

    if (!has) {
      throw new Error(`language ${language.code} (${language.name}) not available`);
    }

    this.language = language;
    this.languageSubject.next(language);
  }

  setLocalization(localization: Localization): void {
    this.setLanguage(localization.language);
  }

  localize(key: string, parameters: { [key: string]: string } = {}): string {
    if (this.language == undefined) {
      throw new Error('language not set');
    }

    const localization = this.localizations.get(this.language.code);

    if (localization == undefined) {
      return `__${key}__`;
    }

    let text = localization.keys.get(key);

    if (text == undefined) {
      return `__${key}__`;
    }

    for (const [parameter, value] of Object.entries(parameters)) {
      const regex = new RegExp(`{{\\s*${parameter}\\s*}}`, 'gui');
      text = text.replace(regex, value);
    }

    return text;
  }

  localize$(key: string, parameters: { [key: string]: string } = {}): Observable<string> {
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
