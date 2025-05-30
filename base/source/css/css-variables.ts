import { objectEntries } from '#/utils/object/object.js';
import { isArray } from '#/utils/type-guards.js';

export class CssVariables implements Disposable {
  readonly #styleSheet = new CSSStyleSheet();
  readonly #cssRule: CSSStyleRule;

  readonly selector: string;
  readonly prefix: string;

  constructor(selector: string | null, prefix: string = '') {
    this.selector = selector ?? ':root';
    this.prefix = prefix;

    document.adoptedStyleSheets.push(this.#styleSheet);
    this.#cssRule = createCssRule<CSSStyleRule>(this.#styleSheet, `${this.selector} {}`);
  }

  [Symbol.dispose](): void {
    const index = document.adoptedStyleSheets.indexOf(this.#styleSheet);

    if (index != -1) {
      document.adoptedStyleSheets.splice(index, 1);
    }
  }

  set(name: string, value: string): void {
    const prefixed = this._prefix(name);
    this.#cssRule.style.setProperty(prefixed, value);
  }

  setMany(variables: Record<string, string> | readonly (readonly [string, string])[]): void {
    const entries = isArray(variables) ? variables : objectEntries(variables);

    for (const [name, value] of entries) {
      this.set(name, value);
    }
  }

  get(name: string): string | null {
    const prefixed = this._prefix(name);
    const rawValue = this.#cssRule.style.getPropertyValue(prefixed);

    if (rawValue.length == 0) {
      return null;
    }

    return rawValue;
  }

  delete(name: string): void {
    const prefixed = this._prefix(name);
    this.#cssRule.style.removeProperty(prefixed);
  }

  clear(): void {
    this.#cssRule.style.cssText = '';
  }

  private _prefix(name: string): string {
    const prefixed = `${this.prefix}${name}`;
    return prefixed.startsWith('--') ? prefixed : `--${prefixed}`;
  }
}

export function cssVariables(selector: string | null = null, prefix: string = ''): CssVariables {
  return new CssVariables(selector, prefix);
}

function createCssRule<T extends CSSRule = CSSRule>(styleSheet: CSSStyleSheet, rule: string): T {
  const index = styleSheet.insertRule(rule);
  return styleSheet.cssRules[index] as T;
}
