import { and, isNotNull as drizzleIsNotNull, isNull as drizzleIsNull, eq, inArray, or, sql } from 'drizzle-orm';

import { BadRequestError } from '#/errors/bad-request.error.js';
import { NotFoundError } from '#/errors/not-found.error.js';
import { inject } from '#/injector/index.js';
import { autoAlias, coalesce, getEntityMap, toJsonb, type NewEntity } from '#/orm/index.js';
import { Transactional } from '#/orm/server/index.js';
import { injectRepository } from '#/orm/server/repository.js';
import type { OneOrMany } from '#/types/index.js';
import { toArray } from '#/utils/array/index.js';
import { assertBooleanPass, assertNumberPass, assertStringPass, isBoolean, isNotNull, isNull, isNumber, isString, isUndefined } from '#/utils/type-guards.js';
import { DocumentProperty, DocumentPropertyDataType, DocumentPropertyValue, DocumentTypeProperty, type Document } from '../../models/index.js';
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
      documentTenantId: autoAlias(document.tenantId),
      propertyTenantId: autoAlias(documentProperty.tenantId),
      label: documentProperty.label,
      dataType: documentProperty.dataType,
      value: coalesce(
        toJsonb(documentPropertyValue.text),
        toJsonb(documentPropertyValue.integer),
        toJsonb(documentPropertyValue.decimal),
        toJsonb(documentPropertyValue.boolean),
        toJsonb(sql<number>`${documentPropertyValue.date} - '1970-01-01'`),
      ).as('value'),
    })
    .from(document)
    .innerJoin(documentType, and(
      eq(documentType.id, document.typeId),
      or(
        drizzleIsNull(documentType.tenantId),
        eq(documentType.tenantId, document.tenantId),
      ),
    ))
    .innerJoin(documentTypeProperty, and(
      eq(documentTypeProperty.typeId, documentType.id),
      or(
        drizzleIsNull(documentTypeProperty.tenantId),
        eq(documentTypeProperty.tenantId, document.tenantId),
      ),
    ))
    .innerJoin(documentProperty, and(
      eq(documentProperty.id, documentTypeProperty.propertyId),
      or(
        drizzleIsNull(documentProperty.tenantId),
        eq(documentProperty.tenantId, document.tenantId),
      ),
    ))
    .leftJoin(documentPropertyValue, and(
      eq(documentPropertyValue.tenantId, document.tenantId),
      eq(documentPropertyValue.documentId, document.id),
      eq(documentPropertyValue.propertyId, documentProperty.id),
    ))
  );

  async loadViews(tenantId: string | null): Promise<DocumentPropertyView[]> {
    const properties = await this.#documentPropertyRepository.loadManyByQuery({ tenantId: { $or: [null, tenantId] } });
    const typeProperties = await this.#documentTypePropertyRepository.loadManyByQuery({ tenantId: { $or: [null, tenantId] } });

    return properties.map((property) => {
      const typeIds = typeProperties
        .filter((typeProperty) => typeProperty.propertyId == property.id)
        .map((typeProperty) => typeProperty.typeId);

      return {
        id: property.id,
        tenantId: property.tenantId,
        label: property.label,
        dataType: property.dataType,
        typeIds,
      };
    });
  }

  async createProperty(data: { tenantId: string | null, label: string, dataType: DocumentPropertyDataType, enumKey?: string }): Promise<DocumentProperty> {
    return await this.#documentPropertyRepository.insert({
      tenantId: data.tenantId,
      label: data.label,
      dataType: data.dataType,
      metadata: { attributes: { [enumTypeKey]: data.enumKey } },
    });
  }

  async updateProperty(tenantId: string | null, id: string, update: { label?: string, dataType?: DocumentPropertyDataType }): Promise<DocumentProperty> {
    return await this.#documentPropertyRepository.updateByQuery({ tenantId, id }, update);
  }

  async assignPropertyToType(tenantId: string | null, typeId: string, propertyId: string): Promise<void> {
    await this.#documentTypePropertyRepository.insert({ tenantId, typeId, propertyId });
  }

  async loadDocumentPropertyValues(tenantId: string, documentId: OneOrMany<string>, includeNulls = false): Promise<DocumentPropertyValueView[]> {
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
        eq(this.documentProperties.documentTenantId, tenantId),
        inArray(this.documentProperties.documentId, toArray(documentId) as string[]),
        inArray(this.documentProperties.propertyTenantId, [null, tenantId]),
        includeNulls ? undefined : drizzleIsNotNull(this.documentProperties.value),
      ));
  }

  async setPropertyValues(document: Document, propertyValues: SetDocumentPropertyParameters[]): Promise<void> {
    if ((propertyValues.length == 0)) {
      return;
    }

    await this.transaction(async (tx) => {
      const propertyIds = propertyValues.map((property) => property.propertyId);

      const properties = await this.#documentPropertyRepository.withTransaction(tx).loadManyByQuery({ tenantId: { $or: [null, document.tenantId] }, id: { $in: propertyIds } });
      const propertiesMap = getEntityMap(properties);

      const upserts = propertyValues.filter((value) => isNotNull(value.value)).map(({ propertyId, value, metadata }) => {
        const property = propertiesMap.get(propertyId);

        if (isUndefined(property)) {
          throw new NotFoundError(`Property "${propertyId}" not found.`);
        }

        validatePropertyValue(propertyId, property.dataType, value);

        return {
          tenantId: document.tenantId,
          documentId: document.id,
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

      await this.#documentPropertyValueRepository.withTransaction(tx).hardDeleteManyByQuery({ tenantId: document.tenantId, documentId: document.id, propertyId: { $in: deletePropertyIds } });
      await this.#documentPropertyValueRepository.withTransaction(tx).upsertMany(['tenantId', 'documentId', 'propertyId'], upserts);

      this.#observationService.documentChange(document.id, tx);
    });
  }
}

function validatePropertyValue(propertyId: string, dataType: DocumentPropertyDataType, value: unknown): void {
  const valid = documentPropertyValueValidators[dataType](value);

  if (!valid) {
    throw new BadRequestError(`Invalid value for data type ${dataType} for property ${propertyId}.`);
  }
}
