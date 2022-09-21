import { NotImplementedError } from '#/error';
import type { EntityDefinition } from '../types';

export class SqlRepository {
  private readonly definition: EntityDefinition;

  constructor(definition: EntityDefinition) {
    this.definition = definition;
  }

  async initialize(): Promise<void> {
    throw new NotImplementedError();
  }
}
