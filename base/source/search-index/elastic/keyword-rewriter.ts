export class KeywordRewriter {
  private readonly fields: Set<string>;

  constructor(fields: Iterable<string>) {
    this.fields = new Set(fields);
  }

  add(field: string): void {
    this.fields.add(field);
  }

  remove(field: string): void {
    this.fields.delete(field);
  }

  requiresRewrite(field: string): boolean {
    return this.fields.has(field);
  }

  rewriteIfRequired(field: string): string {
    return this.requiresRewrite(field) ? `${field}.keyword` : field;
  }
}
