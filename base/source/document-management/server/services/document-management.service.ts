import { eq } from 'drizzle-orm';
import { union } from 'drizzle-orm/pg-core';

import type { CancellationSignal } from '#/cancellation/token.js';
import { Enumerable } from '#/enumerable/index.js';
import type { NewEntity } from '#/orm/index.js';
import { Transactional, injectRepository, injectTransactional } from '#/orm/server/index.js';
import type { Record } from '#/types.js';
import { distinct } from '#/utils/array/index.js';
import { compareByValueSelectionToOrder } from '#/utils/comparison.js';
import { groupToMap, groupToSingleMap } from '#/utils/iterable-helpers/index.js';
import { fromEntries, objectEntries } from '#/utils/object/index.js';
import { cancelableTimeout } from '#/utils/timing.js';
import { assertDefinedPass, isDefined, isNotNull, isNotNullOrUndefined, isNull, isUndefined } from '#/utils/type-guards.js';
import { DocumentAssignmentScope, DocumentAssignmentTask, DocumentCategory, DocumentCollectionAssignment, DocumentRequest, DocumentRequestCollectionAssignment, DocumentRequestTemplate, DocumentRequestsTemplate, DocumentType, DocumentTypeProperty, DocumentValidationExecution, DocumentWorkflowStep, type DocumentProperty, type DocumentPropertyDataType } from '../../models/index.js';
import type { DocumentManagementData, DocumentRequestView, DocumentRequestsTemplateData, DocumentRequestsTemplateView, DocumentView } from '../../service-models/index.js';
import { documentAssignmentScope, documentAssignmentTask, documentCollectionAssignment, documentRequest, documentRequestCollectionAssignment } from '../schemas.js';
import { DocumentCategoryTypeService } from './document-category-type.service.js';
import { DocumentCollectionService } from './document-collection.service.js';
import { DocumentPropertyService } from './document-property.service.js';
import { DocumentWorkflowService } from './document-workflow.service.js';
import { DocumentService } from './document.service.js';
import { enumTypeKey } from './enum-type-key.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentManagementService extends Transactional {
  readonly #documentCollectionService = injectTransactional(DocumentCollectionService);
  readonly #documentCategoryTypeService = injectTransactional(DocumentCategoryTypeService);
  readonly #documentService = injectTransactional(DocumentService);
  readonly #documentPropertyService = injectTransactional(DocumentPropertyService);
  readonly #documentWorkflowService = injectTransactional(DocumentWorkflowService);
  readonly #documentCategoryRepository = injectRepository(DocumentCategory);
  readonly #documentCollectionAssignmentRepository = injectRepository(DocumentCollectionAssignment);
  readonly #documentRequestCollectionAssignmentRepository = injectRepository(DocumentRequestCollectionAssignment);
  readonly #documentAssignmentTaskRepository = injectRepository(DocumentAssignmentTask);
  readonly #documentAssignmentScopeRepository = injectRepository(DocumentAssignmentScope);
  readonly #documentRequestRepository = injectRepository(DocumentRequest);
  readonly #documentRequestsTemplateRepository = injectRepository(DocumentRequestsTemplate);
  readonly #documentRequestTemplateRepository = injectRepository(DocumentRequestTemplate);
  readonly #documentTypeRepository = injectRepository(DocumentType);
  readonly #documentTypePropertyRepository = injectRepository(DocumentTypeProperty);
  readonly #documentValidationExecutionRepository = injectRepository(DocumentValidationExecution);

  /**
   * Get all relevant document collection IDs for a given document. This includes direct assignments, request assignments, and assignment scopes.
   * This method is used to determine which collections a document is associated with, either directly or through requests and assignments.
   * @param documentId The ID of the document to retrieve collection IDs for.
   */
  async getRelevantDocumentCollectionIds(documentId: string): Promise<string[]> {
    const directAssignments = this.#documentCollectionService.session.$with('directAssignments').as((qb) => qb
      .select({ collectionId: documentCollectionAssignment.id })
      .from(documentCollectionAssignment)
      .where(eq(documentCollectionAssignment.documentId, documentId)),
    );

    const requestAssignments = this.#documentRequestCollectionAssignmentRepository.session.$with('requestAssignments').as((qb) => qb
      .select({ collectionId: documentRequestCollectionAssignment.collectionId })
      .from(documentRequest)
      .innerJoin(documentRequestCollectionAssignment, eq(documentRequestCollectionAssignment.requestId, documentRequest.id))
      .where(eq(documentRequest.documentId, documentId)),
    );

    const assignmentScopes = this.#documentAssignmentScopeRepository.session.$with('assignmentScopes').as((qb) => qb
      .select({ collectionId: documentAssignmentScope.collectionId })
      .from(documentAssignmentTask)
      .innerJoin(documentAssignmentScope, eq(documentAssignmentScope.taskId, documentAssignmentTask.id))
      .where(eq(documentAssignmentTask.documentId, documentId)),
    );

    const result = await union(
      this.#documentService.session.with(directAssignments).selectDistinct().from(directAssignments),
      this.#documentService.session.with(requestAssignments).selectDistinct().from(requestAssignments),
      this.#documentService.session.with(assignmentScopes).selectDistinct().from(assignmentScopes),
    );

    return result.map((row) => row.collectionId);
  }

  async *loadDataStream(collectionIds: string[], cancellationSignal: CancellationSignal): AsyncIterableIterator<DocumentManagementData> {
    while (cancellationSignal.isUnset) {
      const data = await this.loadData(collectionIds);
      yield data;

      const timeoutResult = await cancelableTimeout(250, cancellationSignal);

      if (timeoutResult == 'canceled') {
        break;
      }
    }
  }

  async loadData(collectionIds: string[]): Promise<DocumentManagementData> {
    return await this.transaction(async (tx) => {
      const [collections, documentCollectionAssignments, requestAssignments, assignmentScopes, categories, types] = await Promise.all([
        this.#documentCollectionService.withTransaction(tx).repository.loadMany(collectionIds),
        this.#documentCollectionAssignmentRepository.withTransaction(tx).loadManyByQuery({ collectionId: { $in: collectionIds } }),
        this.#documentRequestCollectionAssignmentRepository.withTransaction(tx).loadManyByQuery({ collectionId: { $in: collectionIds } }),
        this.#documentAssignmentScopeRepository.withTransaction(tx).loadManyByQuery({ collectionId: { $in: collectionIds } }),
        this.#documentCategoryRepository.withTransaction(tx).loadManyByQuery({}, { order: 'label' }),
        this.#documentTypeRepository.withTransaction(tx).loadManyByQuery({}, { order: 'label' }),
      ]);

      const collectionsMetadataMap = await this.#documentCollectionService.withTransaction(tx).resolveMetadataMap(...collectionIds);
      const requestIds = requestAssignments.map((requestCollection) => requestCollection.requestId);
      const taskIds = assignmentScopes.map((scope) => scope.taskId);

      const [requests, assignmentTasks] = await Promise.all([
        this.#documentRequestRepository.withTransaction(tx).loadManyByQuery({ id: { $in: requestIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.#documentAssignmentTaskRepository.withTransaction(tx).loadMany(taskIds),
      ]);

      const assignmentDocumentIds = documentCollectionAssignments.map((assignment) => assignment.documentId);
      const requestDocumentIds = requests.map((request) => request.documentId).filter(isNotNull);
      const assignmentTaskDocumentIds = assignmentTasks.map((task) => task.documentId);
      const documentIds = distinct([...assignmentDocumentIds, ...requestDocumentIds, ...assignmentTaskDocumentIds]);

      const [documents, propertyValues, workflows] = await Promise.all([
        this.#documentService.repository.withTransaction(tx).loadManyByQuery({ id: { $in: documentIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.#documentPropertyService.withTransaction(tx).loadDocumentProperties(documentIds),
        this.#documentWorkflowService.withTransaction(tx).loadWorkflows(documentIds),
      ]);

      const documentWorkflowsMap = groupToMap(workflows, (workflow) => workflow.documentId);
      const valuesMap = Enumerable.from(propertyValues).groupToMap((value) => value.documentId);
      const validationWorkflowIds = workflows.map((workflow) => (workflow.step == DocumentWorkflowStep.Validation) ? workflow.id : null).filter(isNotNull);

      const validations = await this.#documentValidationExecutionRepository.withTransaction(tx).loadManyByQuery({ workflowId: { $in: validationWorkflowIds } });
      const workflowValidationsMap = groupToMap(validations, (validation) => validation.workflowId);

      const collectionViews = collections.toSorted(compareByValueSelectionToOrder(collectionIds, (collection) => collection.id)).map((collection) => {
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
      };
    });
  }

  async loadDocumentRequestsTemplateData(): Promise<DocumentRequestsTemplateData> {
    return await this.transaction(async (tx) => {
      const [requestsTemplates, requestTemplates] = await Promise.all([
        this.#documentRequestsTemplateRepository.withTransaction(tx).loadManyByQuery({}, { order: 'label' }),
        this.#documentRequestTemplateRepository.withTransaction(tx).loadManyByQuery({}),
      ]);

      const templates = requestsTemplates.map((requestsTemplate): DocumentRequestsTemplateView => ({
        ...requestsTemplate,
        requestTemplates: requestTemplates.filter((requestTemplate) => requestTemplate.requestsTemplateId == requestsTemplate.id),
      }));

      return { templates };
    });
  }

  async initializeCategoriesAndTypes<CategoryKey extends string, TypeKey extends string, DocumentPropertyKey extends string>(
    categoryLabels: Record<CategoryKey, string>,
    categoryParents: Record<CategoryKey, CategoryKey | null>,
    typeLabels: Record<TypeKey, string>,
    typeCategories: Record<TypeKey, CategoryKey>,
    propertyKeys: Record<DocumentPropertyKey, [DocumentPropertyDataType, string]>,
    typeProperties: Record<TypeKey, DocumentPropertyKey[]>
  ): Promise<{ categories: Record<CategoryKey, DocumentCategory>, types: Record<TypeKey, DocumentType>, properties: Record<DocumentPropertyKey, DocumentProperty> }> {
    const categoryEntries = objectEntries(categoryLabels);
    const typeEntries = objectEntries(typeLabels);
    const propertyEntries = objectEntries(propertyKeys);

    const { categoryMap, typeMap, propertyMap } = await this.transaction(async (tx) => {
      const { categories: dbCategories, types: dbTypes } = await this.#documentCategoryTypeService.withTransaction(tx).loadCategoriesAndTypes();
      const dbProperties = await this.#documentPropertyService.withTransaction(tx).repository.loadAll();

      const categories = dbCategories.filter((category) => isNotNullOrUndefined(category.metadata.attributes[enumTypeKey]));
      const types = dbTypes.filter((type) => isNotNullOrUndefined(type.metadata.attributes[enumTypeKey]));
      const properties = dbProperties.filter((property) => isNotNullOrUndefined(property.metadata.attributes[enumTypeKey]));

      const enumKeyCategoryMap = groupToSingleMap(categories, (category) => category.metadata.attributes[enumTypeKey]);
      const enumKeyTypeMap = groupToSingleMap(types, (type) => type.metadata.attributes[enumTypeKey]);
      const enumKeyPropertyMap = groupToSingleMap(properties, (property) => property.metadata.attributes[enumTypeKey]);

      for (const [key, label] of categoryEntries) {
        const category = enumKeyCategoryMap.get(key);
        const parentKey = assertDefinedPass(categoryParents[key], `Parent category not defined for ${key}`);
        const parentCategory = isNull(parentKey) ? null : assertDefinedPass(enumKeyCategoryMap.get(parentKey));
        const parentCategoryId = parentCategory?.id ?? null;

        if (isUndefined(category)) {
          const category = await this.#documentCategoryTypeService.withTransaction(tx).createCategory(label, parentCategoryId, key);
          enumKeyCategoryMap.set(key, category);
        }
        else if ((category.label != label) || (category.parentId != parentCategoryId)) {
          const updatedCategory = await this.#documentCategoryTypeService.withTransaction(tx).updateCategory(category.id, { label, parentId: parentCategoryId });
          enumKeyCategoryMap.set(key, updatedCategory);
        }
      }

      for (const [key, label] of typeEntries) {
        const type = enumKeyTypeMap.get(key);
        const enumCategory = typeCategories[key];
        const category = assertDefinedPass(enumKeyCategoryMap.get(enumCategory));

        if (isUndefined(type)) {
          const type = await this.#documentCategoryTypeService.withTransaction(tx).createType(label, category.id, key);
          enumKeyTypeMap.set(key, type);
        }
        else if ((type.categoryId != category.id) || (type.label != label)) {
          const updatedType = await this.#documentCategoryTypeService.withTransaction(tx).updateType(type.id, { categoryId: category.id, label: label });
          enumKeyTypeMap.set(key, updatedType);
        }
      }

      for (const [key, [dataType, label]] of propertyEntries) {
        const property = enumKeyPropertyMap.get(key);

        if (isUndefined(property)) {
          const newProperty = await this.#documentPropertyService.withTransaction(tx).createProperty(label, dataType, key);
          enumKeyPropertyMap.set(key, newProperty);
        }
        else if ((property.label != label) || (property.dataType != dataType)) {
          const updatedProperty = await this.#documentPropertyService.withTransaction(tx).updateProperty(property.id, { label, dataType });
          enumKeyPropertyMap.set(key, updatedProperty);
        }
      }

      for (const [typeKey, propertyKeys] of objectEntries(typeProperties)) {
        const type = assertDefinedPass(enumKeyTypeMap.get(typeKey), `Type ${typeKey} not found.`);

        const newEntities = propertyKeys.map((propertyKey): NewEntity<DocumentTypeProperty> => ({
          typeId: type.id,
          propertyId: assertDefinedPass(enumKeyPropertyMap.get(propertyKey), 'Could not get property').id,
        }));

        await this.#documentTypePropertyRepository.withTransaction(tx).upsertMany(['typeId', 'propertyId'], newEntities);
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
