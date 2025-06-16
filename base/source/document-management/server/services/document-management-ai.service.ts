import { and, isNull as drizzleIsNull, eq, inArray } from 'drizzle-orm';
import { P, match } from 'ts-pattern';

import { AiService } from '#/ai/index.js';
import { TemporaryFile } from '#/file/server/index.js';
import { inject } from '#/injector/inject.js';
import { Logger } from '#/logger/logger.js';
import { arrayAgg } from '#/orm/index.js';
import { injectRepository } from '#/orm/server/index.js';
import { array, boolean, enumeration, integer, nullable, number, object, string } from '#/schema/index.js';
import { distinct } from '#/utils/array/index.js';
import { numericDateToDateObject, tryDateObjectToNumericDate, type DateObject } from '#/utils/date-time.js';
import { fromEntries, objectEntries } from '#/utils/object/object.js';
import { assertDefined, assertDefinedPass, assertNotNull, isNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import type { DocumentPropertyDataType } from '../../models/index.js';
import { Document, DocumentProperty, DocumentRequestState, DocumentTypeProperty } from '../../models/index.js';
import type { DocumentCategoryView } from '../../service-models/index.js';
import { documentCategory, documentRequest, documentRequestCollectionAssignment, documentType } from '../schemas.js';
import { DocumentCategoryTypeService } from './document-category-type.service.js';
import { DocumentCollectionService } from './document-collection.service.js';
import { DocumentFileService } from './document-file.service.js';
import { DocumentPropertyService } from './document-property.service.js';
import { DocumentTagService } from './document-tag.service.js';
import { DocumentManagementSingleton } from './singleton.js';

type DocumentInformationExtractionPropertyResult = { propertyId: string, dataType: DocumentPropertyDataType, value: string | number | boolean };

export type DocumentInformationExtractionResult = {
  title: string,
  subtitle: string | null,
  date: number | null,
  summary: string,
  tags: string[],
  properties: DocumentInformationExtractionPropertyResult[],
};

const MODEL = 'gemini-2.5-flash-preview-05-20';

@DocumentManagementSingleton()
export class DocumentManagementAiService {
  readonly #documentCollectionService = inject(DocumentCollectionService);
  readonly #documentTagService = inject(DocumentTagService);
  readonly #documentCategoryTypeService = inject(DocumentCategoryTypeService);
  readonly #documentFileService = inject(DocumentFileService);
  readonly #documentPropertyService = inject(DocumentPropertyService);
  readonly #aiService = inject(AiService);

  readonly #documentPropertyRepository = injectRepository(DocumentProperty);
  readonly #documentRepository = injectRepository(Document);
  readonly #documentTypePropertyRepository = injectRepository(DocumentTypeProperty);
  readonly #logger = inject(Logger, DocumentManagementAiService.name);

  async classifyDocumentType(tenantId: string, documentId: string): Promise<string> {
    const document = await this.#documentRepository.loadByQuery({ tenantId, id: documentId });
    const fileContentStream = this.#documentFileService.getContentStream(document);
    await using tmpFile = await TemporaryFile.from(fileContentStream);

    const filePart = await this.#aiService.processFile({ path: tmpFile.path, mimeType: document.mimeType });
    const categories = await this.#documentCategoryTypeService.loadCategoryViews(tenantId);
    const typeLabelEntries = getDescriptiveTypeLabels(categories);

    const typeLabels = typeLabelEntries.map(({ label }) => label);

    this.#logger.trace(`Classifying document ${document.id}`);

    const documentTypeGeneration = await this.#aiService.generate({
      model: MODEL,
      generationOptions: {
        maxOutputTokens: 128,
        temperature: 0.1,
        topP: 0.75,
        topK: 4,
        thinkingBudget: 0,
      },
      generationSchema: object({
        documentType: enumeration(typeLabels as [string, ...string[]]),
      }),
      contents: [
        {
          role: 'user',
          parts: [
            { file: filePart.file },
            { text: `Klassifiziere den Inhalt des Dokuments in das angegebenen JSON Schema.` },
          ],
        },
      ],
    });

    const typeId = typeLabelEntries.find((entry) => entry.label == documentTypeGeneration.json.documentType)?.id;
    assertDefined(typeId, `Could not classify document ${document.id}`);

    return typeId;
  }

  async extractDocumentInformation(tenantId: string, documentId: string): Promise<DocumentInformationExtractionResult> {
    const document = await this.#documentRepository.loadByQuery({ tenantId, id: documentId });
    const existingTags = await this.#documentTagService.loadTags(tenantId);
    const fileContentStream = this.#documentFileService.getContentStream(document);
    await using tmpFile = await TemporaryFile.from(fileContentStream);

    const filePart = await this.#aiService.processFile({ path: tmpFile.path, mimeType: document.mimeType });

    if (isNull(document.typeId)) {
      throw new Error(`Document ${document.id} has no type`);
    }

    const typeProperties = await this.#documentTypePropertyRepository.loadManyByQuery({ tenantId: { $or: [null, tenantId] }, typeId: document.typeId });
    const propertyIds = typeProperties.map((property) => property.propertyId);
    const properties = (propertyIds.length > 0) ? await this.#documentPropertyRepository.loadManyByQuery({ tenantId: { $or: [null, tenantId] }, id: { $in: propertyIds } }) : undefined;

    const propertiesSchemaEntries = properties?.map((property) => {
      const schema = match(property.dataType)
        .with('text', () => nullable(string()))
        .with('integer', () => nullable(integer()))
        .with('decimal', () => nullable(number()))
        .with('boolean', () => nullable(boolean()))
        .with('date', () => nullable(object({ year: integer(), month: integer(), day: integer() })))
        .exhaustive();

      return [property.label, schema] as const;
    });

    const generationSchema = object({
      documentTitle: string(),
      documentSubtitle: nullable(string()),
      documentSummary: string(),
      documentTags: array(string()),
      documentDate: nullable(object({ year: integer(), month: integer(), day: integer() })),
      ...(
        (isUndefined(propertiesSchemaEntries) || (propertiesSchemaEntries.length == 0))
          ? {}
          : { documentProperties: object(fromEntries(propertiesSchemaEntries)) }
      ),
    });

    const context = { existingTags };

    this.#logger.trace(`Extracting document ${document.id}`);
    const { json: extraction } = await this.#aiService.generate({
      model: MODEL,
      generationOptions: {
        maxOutputTokens: 2048,
        temperature: 0.2,
        topP: 0.5,
        topK: 16,
        thinkingBudget: 0,
      },
      generationSchema,
      contents: [
        {
          role: 'user',
          parts: [
            { file: filePart.file },
            {
              text: `<context>
${JSON.stringify(context, null, 2)}
</context>
              Extrahiere den Inhalt des Dokuments in das angegebenen JSON Schema.

Vermeide es, den Titel im Untertitel zu wiederholen.
Gib in der summary ausführlich an, welche Informationen in dem Dokument vorkommen (ohne konkrete Werte).
Erstelle bis zu 5 Tags. Verwende vorhandene Tags, wenn sie passen. Erstelle neue Tags, wenn es keine passenden gibt.
Vermeide es, den Titel oder Untertitel als Tag zu verwenden.
Antworte auf deutsch.`,
            },
          ],
        },
      ],
    });

    const filteredDocumentTags = extraction.documentTags.filter((tag) => (tag != extraction.documentTitle) && (tag != extraction.documentSubtitle));
    const date = isNotNull(extraction.documentDate) ? tryAiOutputDateObjectToNumericDate(extraction.documentDate) : null;
    const parsedProperties = isUndefined(extraction.documentProperties)
      ? []
      : objectEntries(extraction.documentProperties)
        .map(([propertyLabel, rawValue]): DocumentInformationExtractionPropertyResult | null => {
          if (isNull(rawValue)) {
            return null;
          }

          const property = assertDefinedPass(properties?.find((property) => property.label == propertyLabel));

          const value = match(rawValue)
            .with({ year: P.number }, (value) => tryAiOutputDateObjectToNumericDate(value))
            .otherwise((value) => value);

          if (isNull(value)) {
            return null;
          }

          return { propertyId: property.id, dataType: property.dataType, value };
        })
        .filter(isNotNull);

    return {
      title: extraction.documentTitle,
      subtitle: extraction.documentSubtitle,
      date,
      summary: extraction.documentSummary,
      tags: filteredDocumentTags,
      properties: parsedProperties,
    };
  }

  async findSuitableCollectionsForDocument(document: Document, collectionIds: string[]): Promise<string[]> {
    assertNotNull(document.typeId, 'Document has no type');

    const [documentTags, documentProperties, collectionNamesMap] = await Promise.all([
      this.#documentTagService.loadDocumentTags(document.tenantId, document.id),
      this.#documentPropertyService.loadDocumentPropertyValues(document.tenantId, document.id),
      this.#documentCollectionService.resolveMetadata(document.tenantId, collectionIds),
    ]);

    const collections = collectionIds.map((collectionId, index) => ({
      id: collectionId,
      ...assertDefinedPass(collectionNamesMap[index]),
    }));

    const documentTagLabels = documentTags.map((tag) => tag.label);
    const propertyEntries = documentProperties.map((property) => [property.label, property.value] as const);

    type Context = {
      document: {
        title?: string | null,
        subtitle?: string | null,
        date?: DateObject | null,
        summary?: string | null,
        tags?: string[],
        properties: Record<string, string | number | boolean | null>,
      },
      collections: {
        id: string,
        name: string,
        group: string | null,
      }[],
    };

    const context: Context = {
      document: {
        title: document.title ?? undefined,
        subtitle: document.subtitle ?? undefined,
        date: isNotNull(document.date) ? numericDateToDateObject(document.date) : undefined,
        summary: document.summary ?? undefined,
        tags: (documentTagLabels.length > 0) ? documentTagLabels : undefined,
        properties: fromEntries(propertyEntries),
      },
      collections,
    };

    const result = await this.#aiService.generate({
      model: MODEL,
      generationOptions: {
        maxOutputTokens: 100,
        temperature: 0,
        topP: 0.2,
        topK: 16,
        thinkingBudget: 0,
      },
      generationSchema: object({ collectionIds: array(string()) }),
      contents: [{
        role: 'user',
        parts: [
          {
            text: `<context>
${JSON.stringify(context, null, 2)}
</context>

Ordne das Dokument unter "document" einer oder mehreren passenden Collection unter "collections" zu. Gib es als JSON im angegebenen Schema aus. Wenn keine Collection passt, gib collectionIds als leeres Array zurück.`,
          },
        ],
      }],
    });

    return result.json.collectionIds;
  }

  async findSuitableRequestForDocument(document: Document, collectionIds: string[]): Promise<string | null> {
    const session = this.#documentPropertyRepository.session;

    assertNotNull(document.typeId, 'Document has no type');

    const documentTags = await this.#documentTagService.loadDocumentTags(document.tenantId, document.id);
    const documentProperties = await this.#documentPropertyService.loadDocumentPropertyValues(document.tenantId, document.id);

    const openRequestsWithoutDocument = await session
      .select({
        id: documentRequest.id,
        collectionIds: arrayAgg(documentRequestCollectionAssignment.collectionId),
        documentCategory: documentCategory.label,
        documentType: documentType.label,
        comment: documentRequest.comment,
      })
      .from(documentRequest)
      .innerJoin(documentRequestCollectionAssignment, eq(documentRequestCollectionAssignment.requestId, documentRequest.id))
      .innerJoin(documentType, eq(documentType.id, documentRequest.typeId))
      .innerJoin(documentCategory, eq(documentCategory.id, documentType.categoryId))
      .where(and(
        eq(documentRequest.tenantId, document.tenantId),
        inArray(documentRequestCollectionAssignment.collectionId, collectionIds),
        eq(documentRequest.typeId, document.typeId),
        eq(documentRequest.state, DocumentRequestState.Open),
        drizzleIsNull(documentRequest.documentId),
      ))
      .groupBy(documentRequest.id, documentCategory.label, documentType.label, documentRequest.comment);

    const documentTagLabels = documentTags.map((tag) => tag.label);
    const requestsCollectionIds = distinct(openRequestsWithoutDocument.flatMap((request) => request.collectionIds));

    const collectionNamesMap = await this.#documentCollectionService.resolveMetadataMap(document.tenantId, requestsCollectionIds);

    const requests = openRequestsWithoutDocument.map((request) => ({
      id: request.id,
      collections: request.collectionIds.map((collectionId) => assertDefinedPass(collectionNamesMap[collectionId]).name),
      comment: request.comment ?? undefined,
    }));

    const propertyEntries = documentProperties.map((property) => [property.label, property.value] as const);

    type Context = {
      document: {
        title?: string | null,
        subtitle?: string | null,
        date?: DateObject | null,
        summary?: string | null,
        tags?: string[],
        properties: Record<string, string | number | boolean | null>,
      },
      requests: {
        id: string,
        collections: string[], // names
        comment?: string,
      }[],
    };

    const context: Context = {
      document: {
        title: document.title ?? undefined,
        subtitle: document.subtitle ?? undefined,
        date: isNotNull(document.date) ? numericDateToDateObject(document.date) : undefined,
        summary: document.summary ?? undefined,
        tags: (documentTagLabels.length > 0) ? documentTagLabels : undefined,
        properties: fromEntries(propertyEntries),
      },
      requests,
    };

    const result = await this.#aiService.generate({
      model: MODEL,
      generationOptions: {
        maxOutputTokens: 100,
        temperature: 0,
        topP: 0.2,
        topK: 16,
        thinkingBudget: 0,
      },
      generationSchema: object({ requestId: nullable(string()) }),
      contents: [{
        role: 'user',
        parts: [
          {
            text: `<context>
${JSON.stringify(context, null, 2)}
</context>

Ordne das Dokument unter "document" der passenden Anforderungen unter "requests" zu. Gib es als JSON im angegebenen Schema aus. Wenn keine Anforderung passt, setze requestId auf null.`,
          },
        ],
      }],
    });

    return result.json.requestId;
  }
}

function getDescriptiveTypeLabels(categories: DocumentCategoryView[], prefix = 'Category: '): { id: string, label: string }[] {
  return categories.flatMap((category) => [
    ...category.types.map((type) => ({ id: type.id, label: `${prefix}${category.label} | Type: ${type.label}` })),
    ...getDescriptiveTypeLabels(category.children, `${prefix}${category.label} -> `),
  ]);
}

function tryAiOutputDateObjectToNumericDate(dateObject: DateObject): number | null {
  const date = tryDateObjectToNumericDate(dateObject);

  if (isNull(date)) {
    // try to interpret the date with swapped month and day
    return tryDateObjectToNumericDate({ ...dateObject, month: dateObject.day, day: dateObject.month });
  }

  return date;
}
