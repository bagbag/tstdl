import { and, isNotNull as drizzleIsNotNull, eq, inArray } from 'drizzle-orm';

import { BadRequestError } from '#/errors/bad-request.error.js';
import { inject } from '#/injector/index.js';
import { autoAlias, coalesce, getEntityMap, toJsonb, type NewEntity } from '#/orm/index.js';
import { Transactional } from '#/orm/server/index.js';
import { injectRepository } from '#/orm/server/repository.js';
import type { OneOrMany } from '#/types.js';
import { toArray } from '#/utils/array/index.js';
import { assertBooleanPass, assertDefinedPass, assertNumberPass, assertStringPass, isBoolean, isNotNull, isNull, isNumber, isString } from '#/utils/type-guards.js';
import { DocumentProperty, DocumentPropertyDataType, DocumentPropertyValue, DocumentTypeProperty } from '../../models/index.js';
import type { DocumentPropertyValueView, DocumentPropertyView, SetDocumentPropertyParameters } from '../../service-models/index.js';
import { document, documentProperty, documentPropertyValue, documentType, documentTypeProperty } from '../schemas.js';
import { DocumentManagementObservationService } from './document-management-observation.service.js';
import { enumTypeKey } from './enum-type-key.js';
import { DocumentManagementSingleton } from './singleton.js';

const documentPropertyValueValidators: Record<DocumentPropertyDataType, (value: unknown) => boolean> = {
  [DocumentPropertyDataType.Text]: (value) => isString(value) || isNull(value),
  [DocumentPropertyDataType.Integer]: (value) => isNumber(value) || isNull(value),
  [DocumentPropertyDataType.Decimal]: (value) => isNumber(value) || isNull(value),
  [DocumentPropertyDataType.Boolean]: (value) => isBoolean(value) || isNull(value),
  [DocumentPropertyDataType.Date]: (value) => isNumber(value) || isNull(value),
};

@DocumentManagementSingleton()
export class DocumentPropertyService extends Transactional {
  readonly #documentPropertyRepository = injectRepository(DocumentProperty);
  readonly #documentPropertyValueRepository = injectRepository(DocumentPropertyValue);
  readonly #documentTypePropertyRepository = injectRepository(DocumentTypeProperty);
  readonly #observationService = inject(DocumentManagementObservationService);

  readonly repository = injectRepository(DocumentProperty);

  readonly documentProperties = this.session.$with('documentProperties').as((qb) => qb
    .select({
      documentId: autoAlias(document.id),
      propertyId: autoAlias(documentProperty.id),
      label: documentProperty.label,
      dataType: documentProperty.dataType,
      value: coalesce(
        toJsonb(documentPropertyValue.text),
        toJsonb(documentPropertyValue.integer),
        toJsonb(documentPropertyValue.decimal),
        toJsonb(documentPropertyValue.boolean),
        toJsonb(documentPropertyValue.date),
      ).as('value'),
    })
    .from(document)
    .innerJoin(documentType, eq(documentType.id, document.typeId))
    .innerJoin(documentTypeProperty, eq(documentTypeProperty.typeId, documentType.id))
    .innerJoin(documentProperty, eq(documentProperty.id, documentTypeProperty.propertyId))
    .leftJoin(documentPropertyValue, and(eq(documentPropertyValue.documentId, document.id), eq(documentPropertyValue.propertyId, documentProperty.id)))
  );

  async loadViews(): Promise<DocumentPropertyView[]> {
    const properties = await this.#documentPropertyRepository.loadAll();
    const typeProperties = await this.#documentTypePropertyRepository.loadAll();

    return properties.map((property) => {
      const typeIds = typeProperties
        .filter((typeProperty) => typeProperty.propertyId == property.id)
        .map((typeProperty) => typeProperty.typeId);

      return {
        id: property.id,
        label: property.label,
        dataType: property.dataType,
        typeIds,
      };
    });
  }

  async createProperty(label: string, dataType: DocumentPropertyDataType, enumKey?: string): Promise<DocumentProperty> {
    return await this.#documentPropertyRepository.insert({ label, dataType, metadata: { attributes: { [enumTypeKey]: enumKey } } });
  }

  async updateProperty(id: string, update: { label?: string, dataType?: DocumentPropertyDataType }): Promise<DocumentProperty> {
    return await this.#documentPropertyRepository.update(id, update);
  }

  async assignPropertyToType(typeId: string, propertyId: string): Promise<void> {
    await this.#documentTypePropertyRepository.insert({ typeId, propertyId });
  }

  async loadDocumentProperties(documentId: OneOrMany<string>, includeNulls = false): Promise<DocumentPropertyValueView[]> {
    return await this.session
      .with(this.documentProperties)
      .select({
        documentId: this.documentProperties.documentId,
        propertyId: this.documentProperties.propertyId,
        label: this.documentProperties.label,
        dataType: this.documentProperties.dataType,
        value: this.documentProperties.value,
      })
      .from(this.documentProperties)
      .where(and(
        inArray(this.documentProperties.documentId, toArray(documentId) as string[]),
        includeNulls ? undefined : drizzleIsNotNull(this.documentProperties.value),
      ));
  }

  async setPropertyValues(documentId: string, propertyValues: SetDocumentPropertyParameters[]): Promise<void> {
    if ((propertyValues.length == 0)) {
      return;
    }

    await this.transaction(async (tx) => {
      const propertyIds = propertyValues.map((property) => property.propertyId);

      const properties = await this.#documentPropertyRepository.withTransaction(tx).loadManyByQuery({ id: { $in: propertyIds } });
      const propertiesMap = getEntityMap(properties);

      const upserts = propertyValues.filter((value) => isNotNull(value.value)).map(({ propertyId, value, metadata }) => {
        const property = assertDefinedPass(propertiesMap.get(propertyId));

        validatePropertyValue(propertyId, property.dataType, value);

        return {
          documentId,
          propertyId,
          text: (property.dataType == 'text') ? assertStringPass(value) : null,
          integer: (property.dataType == 'integer') ? assertNumberPass(value) : null,
          decimal: (property.dataType == 'decimal') ? assertNumberPass(value) : null,
          boolean: (property.dataType == 'boolean') ? assertBooleanPass(value) : null,
          date: (property.dataType == 'date') ? assertNumberPass(value) : null,
          metadata,
        } satisfies NewEntity<DocumentPropertyValue>;
      });

      const deletePropertyIds = propertyValues.filter((value) => isNull(value.value)).map(({ propertyId }) => propertyId);

      await this.#documentPropertyValueRepository.withTransaction(tx).hardDeleteManyByQuery({ documentId, propertyId: { $in: deletePropertyIds } });
      await this.#documentPropertyValueRepository.withTransaction(tx).upsertMany(['documentId', 'propertyId'], upserts);

      this.#observationService.documentChange(documentId, tx);
    });
  }
}

function validatePropertyValue(propertyId: string, dataType: DocumentPropertyDataType, value: unknown): void {
  const valid = documentPropertyValueValidators[dataType](value);

  if (!valid) {
    throw new BadRequestError(`Invalid value for data type ${dataType} for property ${propertyId}.`);
  }
}
