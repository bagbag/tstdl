import { getLocalizationKeys, type Localization, type LocalizeItem } from '#/text/localization.service.js';

export const documentManagementlocalizationKeys = getLocalizationKeys<DocumentManagementLocalization>().documentManagement;

export type DocumentManagementLocalization = Localization<{
  documentManagement: {
    documentRequests: LocalizeItem
  }
}, []>;
