import { Enumeration } from '#/schema/schemas/enumeration.js';
import { Optional } from '#/schema/schemas/optional.js';

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
  @Optional([Number, String])
  top?: number | string;

  @Optional([Number, String])
  bottom?: number | string;

  @Optional([Number, String])
  right?: number | string;

  @Optional([Number, String])
  left?: number | string;
}

export class PdfRenderOptions {
  @Optional()
  omitDefaultBackground?: boolean;

  @Optional()
  renderBackground?: boolean;

  @Optional()
  landscape?: boolean;

  @Enumeration(PdfFormat, { optional: true })
  format?: PdfFormat;

  @Optional([String, Number])
  width?: string | number;

  @Optional([String, Number])
  height?: string | number;

  @Optional()
  scale?: number;

  @Optional([String, Number, PdfMarginObject])
  margin?: string | number | PdfMarginObject;

  @Optional()
  displayHeaderFooter?: boolean;

  @Optional()
  headerTemplate?: string;

  @Optional()
  footerTemplate?: string;
}
