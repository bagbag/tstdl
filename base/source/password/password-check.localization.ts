import type { Localization, LocalizeItem } from '#/text/localization.service';
import { getLocalizationKeys } from '#/text/localization.service';
import type zxcvbnTranslationKeys from '@zxcvbn-ts/core/dist/data/translationKeys';

export type PasswordCheckLocalization = Localization<{
  tstdl: {
    passwordCheck: {
      warnings: Record<keyof typeof zxcvbnTranslationKeys.warnings, LocalizeItem>,
      suggestions: Record<keyof typeof zxcvbnTranslationKeys.suggestions, LocalizeItem>
    }
  }
}>;

export const passwordCheckLocalizationKeys = getLocalizationKeys<PasswordCheckLocalization>();

export const germanPasswordCheckLocalization: PasswordCheckLocalization = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    tstdl: {
      passwordCheck: {
        warnings: {
          straightRow: 'Gerade Linien von Tasten auf der Tastatur sind leicht zu erraten.',
          keyPattern: 'Kurze Tastaturmuster sind leicht zu erraten.',
          simpleRepeat: 'Sich wiederholende Zeichen wie "aaa" sind leicht zu erraten.',
          extendedRepeat: 'Sich wiederholende Zeichenmuster wie "abcabcabc" sind leicht zu erraten.',
          sequences: 'Häufige Zeichenfolgen wie "abc" sind leicht zu erraten.',
          recentYears: 'Die jüngsten Jahreszahlen sind leicht zu erraten.',
          dates: 'Ein Datum ist leicht zu erraten.',
          topTen: 'Dies ist ein sehr häufig verwendetes Passwort.',
          topHundred: 'Dies ist ein häufig verwendetes Passwort.',
          common: 'Dies ist ein oft verwendetes Passwort.',
          similarToCommon: 'Dies weist Ähnlichkeit zu anderen oft verwendeten Passwörtern auf.',
          wordByItself: 'Einzelne Wörter sind leicht zu erraten.',
          namesByThemselves: 'Einzelne Namen oder Nachnamen sind leicht zu erraten.',
          commonNames: 'Vornamen und Nachnamen sind leicht zu erraten.',
          userInputs: 'Es sollten keine persönlichen oder Seiten relevanten Daten vorkommen.',
          pwned: 'Ihr Kennwort wurde durch eine Datenpanne im Internet offengelegt.'
        },
        suggestions: {
          l33t: 'Vorhersehbare Buchstabenersetzungen wie \'@\' für \'a\' vermeiden.',
          reverseWords: 'Umgekehrte Schreibweise von gebräuchlichen Wörtern vermeiden.',
          allUppercase: 'Einige, aber nicht alle Buchstaben groß schreiben.',
          capitalization: 'Nicht nur den ersten Buchstaben groß schreiben.',
          dates: 'Daten, die mit persönlichen Daten in Verbindung gebracht werden können, vermeiden.',
          recentYears: 'Die jüngsten Jahreszahlen vermeiden.',
          associatedYears: 'Jahre, die mit persönlichen Daten in Verbindung gebracht werden können, vermeiden.',
          sequences: 'Häufige Zeichenfolgen vermeiden.',
          repeated: 'Wort- und Zeichenwiederholungen vermeiden.',
          longerKeyboardPattern: 'Längere Tastaturmuster in unterschiedlicher Tipprichtung verwenden.',
          anotherWord: 'Weitere Wörter, die weniger häufig vorkommen, hinzufügen.',
          useWords: 'Mehrere Wörter verwenden, aber allgemeine Phrasen vermeiden.',
          noNeed: 'Es ist möglich, starke Passwörter zu erstellen, ohne Symbole, Zahlen oder Großbuchstaben zu verwenden.',
          pwned: 'Wenn Sie dieses Kennwort an anderer Stelle verwenden, sollten Sie es ändern.'
        }
      }
    }
  },
  enums: []
};

export const englishPasswordCheckLocalization: PasswordCheckLocalization = {
  language: { code: 'en', name: 'English' },
  keys: {
    tstdl: {
      passwordCheck: {
        warnings: {
          straightRow: 'Straight rows of keys on your keyboard are easy to guess.',
          keyPattern: 'Short keyboard patterns are easy to guess.',
          simpleRepeat: 'Repeated characters like "aaa" are easy to guess.',
          extendedRepeat: 'Repeated character patterns like "abcabcabc" are easy to guess.',
          sequences: 'Common character sequences like "abc" are easy to guess.',
          recentYears: 'Recent years are easy to guess.',
          dates: 'Dates are easy to guess.',
          topTen: 'This is a heavily used password.',
          topHundred: 'This is a frequently used password.',
          common: 'This is a commonly used password.',
          similarToCommon: 'This is similar to a commonly used password.',
          wordByItself: 'Single words are easy to guess.',
          namesByThemselves: 'Single names or surnames are easy to guess.',
          commonNames: 'Common names and surnames are easy to guess.',
          userInputs: 'There should not be any personal or page related data.',
          pwned: 'Your password was exposed by a data breach on the Internet.'
        },
        suggestions: {
          l33t: 'Avoid predictable letter substitutions like \'@\' for \'a\'.',
          reverseWords: 'Avoid reversed spellings of common words.',
          allUppercase: 'Capitalize some, but not all letters.',
          capitalization: 'Capitalize more than the first letter.',
          dates: 'Avoid dates and years that are associated with you.',
          recentYears: 'Avoid recent years.',
          associatedYears: 'Avoid years that are associated with you.',
          sequences: 'Avoid common character sequences.',
          repeated: 'Avoid repeated words and characters.',
          longerKeyboardPattern: 'Use longer keyboard patterns and change typing direction multiple times.',
          anotherWord: 'Add more words that are less common.',
          useWords: 'Use multiple words, but avoid common phrases.',
          noNeed: 'You can create strong passwords without using symbols, numbers, or uppercase letters.',
          pwned: 'If you use this password elsewhere, you should change it.'
        }
      }
    }
  },
  enums: []
};
