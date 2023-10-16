import { createArray } from '#/utils/array/array.js';
import { memoizeClassSingle } from '#/utils/function/memoize.js';

export class NumberParser {
  private readonly group: string;
  private readonly decimal: string;
  private readonly numeral: RegExp;
  private readonly loosePattern: RegExp;
  private readonly numeralIndex: Map<string, string>;
  private readonly numeralReplacer: (numeral: string) => string;

  readonly locale: string;

  constructor(locale: string) {
    this.locale = locale;

    const format = new Intl.NumberFormat(locale);
    const parts = format.formatToParts(12345.6);
    const numerals = createArray(10, (i) => format.format(i));
    const numeralPattern = `[${numerals.join('')}]`;

    this.numeralIndex = new Map(numerals.map((d, i) => [d, i.toString()]));
    this.group = parts.find((part) => part.type == 'group')!.value;
    this.decimal = parts.find((part) => part.type == 'decimal')!.value;
    this.numeral = new RegExp(numeralPattern, 'ug');
    this.loosePattern = new RegExp(`[^${numerals.join()}${this.group}${this.decimal}]`, 'ug');
    this.numeralReplacer = (numeral: string): string => this.numeralIndex.get(numeral)!;
  }

  /**
   * Parse a string
   * @param value Value to parse
   * @param loose Try to parse an invalid string by removing unsupported characters. Might produce incorrect results, depending on input
   */
  parse(value: string, loose: boolean = false): number {
    const source = loose ? value.replaceAll(this.loosePattern, '') : value;
    const normalized = source.trim()
      .replaceAll(this.group, '')
      .replaceAll(this.decimal, '.')
      .replaceAll(this.numeral, this.numeralReplacer);

    return Number(normalized);
  }
}

export const getNumberParser = memoizeClassSingle(NumberParser);

export function parseNumber(locale: string, value: string, loose?: boolean): number {
  return getNumberParser(locale).parse(value, loose);
}
