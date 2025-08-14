import { and, eq } from 'drizzle-orm';
import { union } from 'drizzle-orm/pg-core';

import type { CancellationSignal } from '#/cancellation/token.js';
import { Enumerable } from '#/enumerable/index.js';
import { inject } from '#/injector/index.js';
import { Logger } from '#/logger/logger.js';
import type { NewEntity } from '#/orm/index.js';
import { Transactional, injectRepository, injectTransactional } from '#/orm/server/index.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import type { Record } from '#/types/index.js';
import { distinct } from '#/utils/array/index.js';
import { compareByValueSelection } from '#/utils/comparison.js';
import { groupToMap, groupToSingleMap } from '#/utils/iterable-helpers/index.js';
import { fromEntries, objectEntries } from '#/utils/object/index.js';
import { assertDefinedPass, isDefined, isNotNull, isNotNullOrUndefined, isNull, isUndefined } from '#/utils/type-guards.js';
import { filter, merge } from 'rxjs';
import { DocumentAssignmentScope, DocumentAssignmentTask, DocumentCategory, DocumentCollectionAssignment, DocumentRequest, DocumentRequestCollectionAssignment, DocumentRequestTemplate, DocumentRequestsTemplate, DocumentType, DocumentTypeProperty, DocumentValidationExecution, DocumentWorkflowStep, type DocumentProperty, type DocumentPropertyDataType } from '../../models/index.js';
import type { DocumentManagementData, DocumentRequestView, DocumentRequestsTemplateData, DocumentRequestsTemplateView, DocumentView } from '../../service-models/index.js';
import { documentAssignmentScope, documentAssignmentTask, documentCollectionAssignment, documentRequest, documentRequestCollectionAssignment } from '../schemas.js';
import { DocumentCategoryTypeService } from './document-category-type.service.js';
import { DocumentCollectionService } from './document-collection.service.js';
import { DocumentManagementObservationService } from './document-management-observation.service.js';
import { DocumentPropertyService } from './document-property.service.js';
import { DocumentTagService } from './document-tag.service.js';
import { DocumentWorkflowService } from './document-workflow.service.js';
import { DocumentService } from './document.service.js';
import { enumTypeKey } from './enum-type-key.js';
import { DocumentManagementSingleton } from './singleton.js';

export type DocumentCategoryLabels<CategoryKey extends string> = Record<CategoryKey, string>;
export type DocumentCategoryParents<CategoryKey extends string> = Record<CategoryKey, CategoryKey | null>;
export type DocumentTypeLabels<TypeKey extends string> = Record<TypeKey, string>;
export type DocumentTypeCategories<TypeKey extends string, CategoryKey extends string> = Record<TypeKey, CategoryKey>;
export type DocumentPropertyConfigurations<DocumentPropertyKey extends string> = Record<DocumentPropertyKey, [DocumentPropertyDataType, label: string]>;
export type DocumentTypeProperties<TypeKey extends string, DocumentPropertyKey extends string> = Record<TypeKey, DocumentPropertyKey[]>;

/**
 * @example
 * ```ts
 * import { DocumentPropertyDataType } from '#/document-management/index.js';
 * import type { DocumentCategoryLabels, DocumentCategoryParents, DocumentPropertyConfigurations, DocumentTypeCategories, DocumentTypeLabels, DocumentTypeProperties } from '#/document-management/server/index.js';
 * import { defineEnum, type EnumType } from '#/enumeration/index.js';
 *
 * export const MyDocumentCategory = defineEnum('MyDocumentCategory', {
 *   Administration: 'administration',
 *   Finance: 'finance',
 * });
 *
 * type MyDocumentCategory = EnumType<typeof MyDocumentCategory>;
 *
 * export const MyCategoryParents = {
 *   [MyDocumentCategory.Administration]: null,
 *   [MyDocumentCategory.Finance]: MyDocumentCategory.Administration,
 * } as const satisfies DocumentCategoryParents<MyDocumentCategory>;
 *
 * export const MyDocumentCategoryLabels = {
 *   [MyDocumentCategory.Administration]: 'Allgemeine Verwaltung',
 *   [MyDocumentCategory.Finance]: 'Finanzen',
 * } as const satisfies DocumentCategoryLabels<MyDocumentCategory>;
 *
 * export const MyDocumentType = defineEnum('MyDocumentType', {
 *   TerminationNotice: 'termination-notice',
 *   ComplaintLetter: 'complaint-letter',
 *   IncomingInvoice: 'incoming-invoice',
 *   OutgoingInvoice: 'outgoing-invoice',
 * });
 *
 * type MyDocumentType = EnumType<typeof MyDocumentType>;
 *
 * export const MyDocumentTypeLabels = {
 *   [MyDocumentType.TerminationNotice]: 'Kündigungsschreiben',
 *   [MyDocumentType.ComplaintLetter]: 'Beschwerdeschreiben',
 *   [MyDocumentType.IncomingInvoice]: 'Eingangsrechnung',
 *   [MyDocumentType.OutgoingInvoice]: 'Ausgangsrechnung',
 * } as const satisfies DocumentTypeLabels<MyDocumentType>;
 *
 * export const MyDocumentTypeCategories = {
 *   [MyDocumentType.TerminationNotice]: MyDocumentCategory.Administration,
 *   [MyDocumentType.ComplaintLetter]: MyDocumentCategory.Administration,
 *   [MyDocumentType.IncomingInvoice]: MyDocumentCategory.Finance,
 *   [MyDocumentType.OutgoingInvoice]: MyDocumentCategory.Finance,
 * } as const satisfies DocumentTypeCategories<MyDocumentType, MyDocumentCategory>;
 *
 * export const MyDocumentProperty = defineEnum('MyDocumentProperty', {
 *   Correspondent: 'correspondent',
 *   ContractNumber: 'contract-number',
 *   Amount: 'amount',
 * });
 *
 * export type MyDocumentProperty = EnumType<typeof MyDocumentProperty>;
 *
 * export const MyDocumentPropertyConfiguration = {
 *   [MyDocumentProperty.Correspondent]: [DocumentPropertyDataType.Text, 'Korrespondent'],
 *   [MyDocumentProperty.ContractNumber]: [DocumentPropertyDataType.Text, 'Vertragsnummer'],
 *   [MyDocumentProperty.Amount]: [DocumentPropertyDataType.Decimal, 'Betrag'],
 * } as const satisfies DocumentPropertyConfigurations<MyDocumentProperty>;
 *
 * export const MyDocumentTypeProperties = {
 *   [MyDocumentType.TerminationNotice]: [MyDocumentProperty.Correspondent, MyDocumentProperty.ContractNumber],
 *   [MyDocumentType.ComplaintLetter]: [MyDocumentProperty.Correspondent],
 *   [MyDocumentType.IncomingInvoice]: [MyDocumentProperty.Correspondent, MyDocumentProperty.Amount],
 *   [MyDocumentType.OutgoingInvoice]: [MyDocumentProperty.Correspondent, MyDocumentProperty.Amount],
 * } as const satisfies DocumentTypeProperties<MyDocumentType, MyDocumentProperty>;
 * ```
 */
export type CategoriesAndTypesInitializationData<CategoryKey extends string, TypeKey extends string, DocumentPropertyKey extends string> = {
  categoryLabels: DocumentCategoryLabels<CategoryKey>,
  categoryParents: DocumentCategoryParents<NoInfer<CategoryKey>>,
  typeLabels: DocumentTypeLabels<TypeKey>,
  typeCategories: DocumentTypeCategories<NoInfer<TypeKey>, NoInfer<CategoryKey>>,
  propertyConfigurations: DocumentPropertyConfigurations<DocumentPropertyKey>,
  typeProperties: DocumentTypeProperties<NoInfer<TypeKey>, NoInfer<DocumentPropertyKey>>,
};

@DocumentManagementSingleton()
export class DocumentManagementService extends Transactional {
  readonly #documentCollectionService = injectTransactional(DocumentCollectionService);
  readonly #documentCategoryTypeService = injectTransactional(DocumentCategoryTypeService);
  readonly #documentService = injectTransactional(DocumentService);
  readonly #documentPropertyService = injectTransactional(DocumentPropertyService);
  readonly #documentWorkflowService = injectTransactional(DocumentWorkflowService);
  readonly #documentTagService = injectTransactional(DocumentTagService);
  readonly #documentCollectionAssignmentRepository = injectRepository(DocumentCollectionAssignment);
  readonly #documentRequestCollectionAssignmentRepository = injectRepository(DocumentRequestCollectionAssignment);
  readonly #documentAssignmentTaskRepository = injectRepository(DocumentAssignmentTask);
  readonly #documentAssignmentScopeRepository = injectRepository(DocumentAssignmentScope);
  readonly #documentRequestRepository = injectRepository(DocumentRequest);
  readonly #documentRequestsTemplateRepository = injectRepository(DocumentRequestsTemplate);
  readonly #documentRequestTemplateRepository = injectRepository(DocumentRequestTemplate);
  readonly #documentTypePropertyRepository = injectRepository(DocumentTypeProperty);
  readonly #documentValidationExecutionRepository = injectRepository(DocumentValidationExecution);
  readonly #observationService = inject(DocumentManagementObservationService);
  readonly #logger = inject(Logger, DocumentManagementService.name);

  /**
   * Get all relevant document collection IDs for a given document. This includes direct assignments, request assignments, and assignment scopes.
   * This method is used to determine which collections a document is associated with, either directly or through requests and assignments.
   * @param documentId The ID of the document to retrieve collection IDs for.
   */
  async getRelevantDocumentCollectionIds(tenantId: string, documentId: string): Promise<string[]> {
    const directAssignments = this.#documentCollectionService.session.$with('directAssignments').as((qb) => qb
      .select({ collectionId: documentCollectionAssignment.id })
      .from(documentCollectionAssignment)
      .where(and(
        eq(documentCollectionAssignment.tenantId, tenantId),
        eq(documentCollectionAssignment.documentId, documentId),
      )),
    );

    const requestAssignments = this.#documentRequestCollectionAssignmentRepository.session.$with('requestAssignments').as((qb) => qb
      .select({ collectionId: documentRequestCollectionAssignment.collectionId })
      .from(documentRequest)
      .innerJoin(documentRequestCollectionAssignment, eq(documentRequestCollectionAssignment.requestId, documentRequest.id))
      .where(and(
        eq(documentRequest.tenantId, tenantId),
        eq(documentRequest.documentId, documentId),
      )),
    );

    const assignmentScopes = this.#documentAssignmentScopeRepository.session.$with('assignmentScopes').as((qb) => qb
      .select({ collectionId: documentAssignmentScope.collectionId })
      .from(documentAssignmentTask)
      .innerJoin(documentAssignmentScope, eq(documentAssignmentScope.taskId, documentAssignmentTask.id))
      .where(and(
        eq(documentAssignmentTask.tenantId, tenantId),
        eq(documentAssignmentTask.documentId, documentId),
      )),
    );

    const result = await union(
      this.#documentService.session.with(directAssignments).select().from(directAssignments),
      this.#documentService.session.with(requestAssignments).select().from(requestAssignments),
      this.#documentService.session.with(assignmentScopes).select().from(assignmentScopes),
    );

    return result.map((row) => row.collectionId);
  }

  async *loadDataStream(tenantId: string, collectionIds: string[], cancellationSignal: CancellationSignal): AsyncIterableIterator<DocumentManagementData> {
    const continuePromise = new DeferredPromise();

    const newData$ = this.#observationService.collectionsChangedMessageBus.allMessages$.pipe(
      filter((changedCollectionIds) => collectionIds.some((id) => changedCollectionIds.includes(id))),
    );

    const subscription = merge(newData$, cancellationSignal).subscribe(() => continuePromise.resolveIfPending());

    try {
      while (cancellationSignal.isUnset) {
        yield await this.loadData(tenantId, collectionIds);

        await continuePromise;
        continuePromise.reset();
      }
    }
    finally {
      subscription.unsubscribe();
    }
  }

  async loadData(tenantId: string, collectionIds: string[]): Promise<DocumentManagementData> {
    return await this.transaction(async (tx) => {
      const [collections, documentCollectionAssignments, requestAssignments, assignmentScopes, { categories, types }] = await Promise.all([
        this.#documentCollectionService.repository.withTransaction(tx).loadManyByQuery({ tenantId, id: { $in: collectionIds } }),
        this.#documentCollectionAssignmentRepository.withTransaction(tx).loadManyByQuery({ tenantId, collectionId: { $in: collectionIds } }),
        this.#documentRequestCollectionAssignmentRepository.withTransaction(tx).loadManyByQuery({ tenantId, collectionId: { $in: collectionIds } }),
        this.#documentAssignmentScopeRepository.withTransaction(tx).loadManyByQuery({ tenantId, collectionId: { $in: collectionIds } }),
        this.#documentCategoryTypeService.withTransaction(tx).loadCategoriesAndTypes(tenantId),
      ]);

      const collectionsMetadataMap = await this.#documentCollectionService.withTransaction(tx).resolveMetadataMap(tenantId, collections);
      const requestIds = requestAssignments.map((requestCollection) => requestCollection.requestId);
      const taskIds = assignmentScopes.map((scope) => scope.taskId);

      const [requests, assignmentTasks] = await Promise.all([
        this.#documentRequestRepository.withTransaction(tx).loadManyByQuery({ tenantId, id: { $in: requestIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.#documentAssignmentTaskRepository.withTransaction(tx).loadManyByQuery({ tenantId, id: { $in: taskIds } }),
      ]);

      const assignmentDocumentIds = documentCollectionAssignments.map((assignment) => assignment.documentId);
      const requestDocumentIds = requests.map((request) => request.documentId).filter(isNotNull);
      const assignmentTaskDocumentIds = assignmentTasks.map((task) => task.documentId);
      const documentIds = distinct([...assignmentDocumentIds, ...requestDocumentIds, ...assignmentTaskDocumentIds]);

      const [documents, propertyViews, propertyValues, workflows] = await Promise.all([
        this.#documentService.repository.withTransaction(tx).loadManyByQuery({ tenantId, id: { $in: documentIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.#documentPropertyService.withTransaction(tx).loadViews(tenantId),
        this.#documentPropertyService.withTransaction(tx).loadDocumentPropertyValues(tenantId, documentIds),
        this.#documentWorkflowService.withTransaction(tx).loadWorkflows(tenantId, documentIds),
      ]);

      const documentTagAssignments = await this.#documentTagService.tagAssignmentRepository.withTransaction(tx).loadManyByQuery({ tenantId, documentId: { $in: documentIds } });

      const tags = await this.#documentTagService.withTransaction(tx).loadTags(tenantId);

      const documentTagsMap = groupToMap(documentTagAssignments, (assignment) => assignment.documentId);
      const documentWorkflowsMap = groupToMap(workflows, (workflow) => workflow.documentId);
      const valuesMap = Enumerable.from(propertyValues).groupToMap((value) => value.documentId);
      const validationWorkflowIds = workflows.map((workflow) => (workflow.step == DocumentWorkflowStep.Validation) ? workflow.id : null).filter(isNotNull);

      const validations = await this.#documentValidationExecutionRepository.withTransaction(tx).loadManyByQuery({ tenantId, workflowId: { $in: validationWorkflowIds } });
      const workflowValidationsMap = groupToMap(validations, (validation) => validation.workflowId);

      const collectionViews = collections
        .toSorted(compareByValueSelection((collection) => collectionIds.indexOf(collection.id)))
        .map((collection) => {
          const metadata = assertDefinedPass(collectionsMetadataMap[collection.id]);

          return ({
            ...collection,
            name: metadata.name,
            group: metadata.group,
          });
        });

      const documentViews = documents.map((document): DocumentView => {
        const documentWorkflows = documentWorkflowsMap.get(document.id) ?? [];
        const documentValidations = documentWorkflows.flatMap((workflow) => workflowValidationsMap.get(workflow.id) ?? []);
        const documentAssignmentTask = assignmentTasks.find((task) => task.documentId == document.id);
        const documentAssignmentTaskScope = isDefined(documentAssignmentTask) ? assignmentScopes.filter((scope) => scope.taskId == documentAssignmentTask.id).map((scope) => scope.collectionId) : [];

        return {
          ...document,
          assignment: {
            collections: documentCollectionAssignments.filter((collectionDocument) => collectionDocument.documentId == document.id),
            assignmentTask: isDefined(documentAssignmentTask)
              ? { target: documentAssignmentTask.target, scope: documentAssignmentTaskScope }
              : null,
          },
          tagIds: documentTagsMap.get(document.id)?.map((assignment) => assignment.tagId) ?? [],
          properties: valuesMap.get(document.id) ?? [],
          workflows: documentWorkflows,
          validations: documentValidations,
        };
      });

      const requestViews = requests.map((request): DocumentRequestView => ({
        ...request,
        collectionIds: requestAssignments.filter((requestCollection) => requestCollection.requestId == request.id).map((requestCollection) => requestCollection.collectionId),
      }));

      return {
        collections: collectionViews,
        documents: documentViews,
        requests: requestViews,
        categories,
        types,
        tags,
        properties: propertyViews,
      };
    });
  }

  async loadDocumentRequestsTemplateData(tenantId: string | null): Promise<DocumentRequestsTemplateData> {
    return await this.transaction(async (tx) => {
      const [requestsTemplates, requestTemplates] = await Promise.all([
        this.#documentRequestsTemplateRepository.withTransaction(tx).loadManyByQuery({ tenantId }, { order: 'label' }),
        this.#documentRequestTemplateRepository.withTransaction(tx).loadManyByQuery({ tenantId }),
      ]);

      const templates = requestsTemplates.map((requestsTemplate): DocumentRequestsTemplateView => ({
        ...requestsTemplate,
        requestTemplates: requestTemplates.filter((requestTemplate) => requestTemplate.requestsTemplateId == requestsTemplate.id),
      }));

      return { templates };
    });
  }

  async initializeCategoriesAndTypes<CategoryKey extends string, TypeKey extends string, DocumentPropertyKey extends string>(
    tenantId: string | null,
    data: CategoriesAndTypesInitializationData<CategoryKey, TypeKey, DocumentPropertyKey>
  ): Promise<{ categories: Record<CategoryKey, DocumentCategory>, types: Record<TypeKey, DocumentType>, properties: Record<DocumentPropertyKey, DocumentProperty> }> {
    const categoryEntries = objectEntries(data.categoryLabels);
    const typeEntries = objectEntries(data.typeLabels);
    const propertyEntries = objectEntries(data.propertyConfigurations);

    const { categoryMap, typeMap, propertyMap } = await this.transaction(async (tx) => {
      const { categories: dbCategories, types: dbTypes } = await this.#documentCategoryTypeService.withTransaction(tx).loadCategoriesAndTypes(tenantId);
      const dbProperties = await this.#documentPropertyService.withTransaction(tx).repository.loadManyByQuery({ tenantId });

      const categories = dbCategories.filter((category) => isNotNullOrUndefined(category.metadata.attributes[enumTypeKey]));
      const types = dbTypes.filter((type) => isNotNullOrUndefined(type.metadata.attributes[enumTypeKey]));
      const properties = dbProperties.filter((property) => isNotNullOrUndefined(property.metadata.attributes[enumTypeKey]));

      const enumKeyCategoryMap = groupToSingleMap(categories, (category) => category.metadata.attributes[enumTypeKey]);
      const enumKeyTypeMap = groupToSingleMap(types, (type) => type.metadata.attributes[enumTypeKey]);
      const enumKeyPropertyMap = groupToSingleMap(properties, (property) => property.metadata.attributes[enumTypeKey]);

      for (const [enumKey, label] of categoryEntries) {
        const category = enumKeyCategoryMap.get(enumKey);
        const parentKey = assertDefinedPass(data.categoryParents[enumKey], `Parent category not defined for ${enumKey}`);
        const parentCategory = isNull(parentKey) ? null : assertDefinedPass(enumKeyCategoryMap.get(parentKey));
        const parentCategoryId = parentCategory?.id ?? null;

        if (isUndefined(category)) {
          const category = await this.#documentCategoryTypeService.withTransaction(tx).createCategory({ tenantId, label, parentId: parentCategoryId, enumKey });
          enumKeyCategoryMap.set(enumKey, category);
          this.#logger.info(`Created category ${category.label}`);
        }
        else if ((category.label != label) || (category.parentId != parentCategoryId)) {
          const updatedCategory = await this.#documentCategoryTypeService.withTransaction(tx).updateCategory(tenantId, category.id, { label, parentId: parentCategoryId });
          enumKeyCategoryMap.set(enumKey, updatedCategory);
          this.#logger.info(`Updated category ${updatedCategory.label}`);
        }
      }

      for (const [enumKey, label] of typeEntries) {
        const type = enumKeyTypeMap.get(enumKey);
        const enumCategory = data.typeCategories[enumKey];
        const category = assertDefinedPass(enumKeyCategoryMap.get(enumCategory));

        if (isUndefined(type)) {
          const type = await this.#documentCategoryTypeService.withTransaction(tx).createType({ tenantId, label, categoryId: category.id, enumKey });
          enumKeyTypeMap.set(enumKey, type);
          this.#logger.info(`Created type ${type.label} in category ${category.label}`);
        }
        else if ((type.categoryId != category.id) || (type.label != label)) {
          const updatedType = await this.#documentCategoryTypeService.withTransaction(tx).updateType(tenantId, type.id, { categoryId: category.id, label: label });
          enumKeyTypeMap.set(enumKey, updatedType);
          this.#logger.info(`Updated type ${updatedType.label} in category ${category.label}`);
        }
      }

      for (const [enumKey, [dataType, label]] of propertyEntries) {
        const property = enumKeyPropertyMap.get(enumKey);

        if (isUndefined(property)) {
          const newProperty = await this.#documentPropertyService.withTransaction(tx).createProperty({ tenantId, label, dataType, enumKey });
          enumKeyPropertyMap.set(enumKey, newProperty);
          this.#logger.info(`Created property ${newProperty.label} of type ${dataType}`);
        }
        else if ((property.label != label) || (property.dataType != dataType)) {
          const updatedProperty = await this.#documentPropertyService.withTransaction(tx).updateProperty(tenantId, property.id, { label, dataType });
          enumKeyPropertyMap.set(enumKey, updatedProperty);
          this.#logger.info(`Updated property ${updatedProperty.label} of type ${updatedProperty.dataType}`);
        }
      }

      for (const [typeKey, propertyKeys] of objectEntries(data.typeProperties)) {
        const type = assertDefinedPass(enumKeyTypeMap.get(typeKey), `Type ${typeKey} not found.`);

        const newEntities = propertyKeys.map((propertyKey): NewEntity<DocumentTypeProperty> => ({
          tenantId,
          typeId: type.id,
          propertyId: assertDefinedPass(enumKeyPropertyMap.get(propertyKey), 'Could not get property').id,
        }));

        await this.#documentTypePropertyRepository.withTransaction(tx).upsertMany(['tenantId', 'typeId', 'propertyId'], newEntities);
      }

      return { categoryMap: enumKeyCategoryMap, typeMap: enumKeyTypeMap, propertyMap: enumKeyPropertyMap };
    });

    const mappedCategories = categoryEntries.map(([key]) => [key, assertDefinedPass(categoryMap.get(key), 'Could not map document category.')] as const);
    const mappedTypes = typeEntries.map(([key]) => [key, assertDefinedPass(typeMap.get(key), 'Could not map document type.')] as const);
    const mappedProperties = propertyEntries.map(([key]) => [key, assertDefinedPass(propertyMap.get(key), 'Could not map document property.')] as const);

    return {
      categories: fromEntries<CategoryKey, DocumentCategory>(mappedCategories),
      types: fromEntries<TypeKey, DocumentType>(mappedTypes),
      properties: fromEntries<DocumentPropertyKey, DocumentProperty>(mappedProperties),
    };
  }
}
