import { Enumeration, Optional, Union } from '#/schema/index.js';

export enum PdfFormat {
  Letter = 'letter',
  Legal = 'legal',
  Tabloid = 'tabloid',
  Ledger = 'ledger',
  A0 = 'a0',
  A1 = 'a1',
  A2 = 'a2',
  A3 = 'a3',
  A4 = 'a4',
  A5 = 'a5',
  A6 = 'a6'
}

export class PdfMarginObject {
  @Union(Number, String, { optional: true })
  top?: number | string;

  @Union(Number, String, { optional: true })
  bottom?: number | string;

  @Union(Number, String, { optional: true })
  right?: number | string;

  @Union(Number, String, { optional: true })
  left?: number | string;
}

export class PdfRenderOptions {
  @Optional()
  renderBackground?: boolean;

  @Optional()
  landscape?: boolean;

  @Enumeration(PdfFormat, { optional: true })
  format?: PdfFormat;

  @Union(String, Number, { optional: true })
  width?: string | number;

  @Union(String, Number, { optional: true })
  height?: string | number;

  @Optional()
  scale?: number;

  @Union(String, Number, PdfMarginObject, { optional: true })
  margin?: string | number | PdfMarginObject;

  @Optional()
  displayHeaderFooter?: boolean;

  @Optional()
  headerTemplate?: string;

  @Optional()
  footerTemplate?: string;

  /**
   * Timeout for closing render context in case something went wrong.
   * @default 60000 (1 minute)
   */
  @Optional()
  timeout?: number;
}
