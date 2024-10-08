import { getLocalizationKeys, type Localization, type LocalizeItem } from './localization.service.js';

export type TstdlCommonLocalization = Localization<{
  tstdl: {
    firstName: LocalizeItem,
    lastName: LocalizeItem,
    mailAddress: LocalizeItem,
    password: LocalizeItem,
    confirmPassword: LocalizeItem,
    notSpecified: LocalizeItem,
    select: LocalizeItem,
    yes: LocalizeItem,
    no: LocalizeItem,
    ok: LocalizeItem,
    success: LocalizeItem,
    cancel: LocalizeItem,
    add: LocalizeItem,
    save: LocalizeItem,
    remove: LocalizeItem
  }
}>;

export const tstdlCommonLocalizationKeys = getLocalizationKeys<TstdlCommonLocalization>().tstdl;

export const germanTstdlCommonLocalization: TstdlCommonLocalization = {
  language: { code: 'de', name: 'Deutsch' },
  keys: {
    tstdl: {
      firstName: 'Vorname',
      lastName: 'Nachname',
      mailAddress: 'E-Mail Adresse',
      password: 'Passwort',
      confirmPassword: 'Passwort bestätigen',
      notSpecified: 'Keine Angabe',
      select: 'Auswählen',
      yes: 'Ja',
      no: 'Nein',
      ok: 'Ok',
      success: 'Erfolgreich',
      cancel: 'Abbrechen',
      add: 'Hinzufügen',
      save: 'Speichern',
      remove: 'Entfernen'
    }
  },
  enums: []
};

export const englishTstdlCommonLocalization: TstdlCommonLocalization = {
  language: { code: 'en', name: 'English' },
  keys: {
    tstdl: {
      firstName: 'First name',
      lastName: 'Last name',
      mailAddress: 'E-Mail address',
      password: 'Password',
      confirmPassword: 'Confirm password',
      notSpecified: 'Not specified',
      select: 'Select',
      yes: 'Yes',
      no: 'No',
      ok: 'Ok',
      success: 'Success',
      cancel: 'Cancel',
      add: 'Add',
      save: 'Save',
      remove: 'Remove'
    }
  },
  enums: []
};
