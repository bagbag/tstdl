import { english } from './english.js';
import { german } from './german.js';
import type { DocumentManagementLocalization } from './localization.js';

export * from './english.js';
export * from './german.js';
export * from './localization.js';

export const documentManagementLocalizations: DocumentManagementLocalization[] = [
  english,
  german
];
