import { signal } from '@angular/core';

export class DocumentFilter {
  searchText = signal<string | null>('');
  collections = signal<string[]>([]);
  categories = signal<string[]>([]);
  types = signal<string[]>([]);
  tags = signal<string[]>([]);
}
