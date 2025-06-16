import { Transactional } from '#/orm/server/index.js';
import { injectRepository } from '#/orm/server/repository.js';
import { groupToMap } from '#/utils/iterable-helpers/group-to-map.js';
import { isUndefined } from '#/utils/type-guards.js';
import { DocumentCategory, DocumentType } from '../../models/index.js';
import type { DocumentCategoryView } from '../../service-models/index.js';
import { enumTypeKey } from './enum-type-key.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentCategoryTypeService extends Transactional {
  readonly categoryRepository = injectRepository(DocumentCategory);
  readonly typeRepository = injectRepository(DocumentType);

  async loadCategory(tenantId: string, id: string): Promise<DocumentCategory> {
    return await this.categoryRepository.loadByQuery({ id, tenantId: { $or: [null, tenantId] } });
  }

  async loadType(tenantId: string, id: string): Promise<DocumentType> {
    return await this.typeRepository.loadByQuery({ id, tenantId: { $or: [null, tenantId] } });
  }

  async createCategory(data: { tenantId: string | null, label: string, parentId: string | null, enumKey?: string }): Promise<DocumentCategory> {
    return await this.categoryRepository.insert({
      tenantId: data.tenantId,
      label: data.label,
      parentId: data.parentId,
      metadata: { attributes: { [enumTypeKey]: data.enumKey } },
    });
  }

  async createType(data: { tenantId: string | null, label: string, categoryId: string, enumKey?: string }): Promise<DocumentType> {
    // Ensure the category exists for the tenant before creating the type
    await this.categoryRepository.loadByQuery({ tenantId: { $or: [null, data.tenantId] }, id: data.categoryId });

    return await this.typeRepository.insert({
      tenantId: data.tenantId,
      label: data.label,
      categoryId: data.categoryId,
      metadata: { attributes: { [enumTypeKey]: data.enumKey } },
    });
  }

  async updateCategory(tenantId: string | null, id: string, update: { label?: string, parentId?: string | null }): Promise<DocumentCategory> {
    return await this.categoryRepository.updateByQuery({ tenantId, id }, update);
  }

  async updateType(tenantId: string | null, id: string, update: { label?: string, categoryId?: string }): Promise<DocumentType> {
    return await this.typeRepository.updateByQuery({ tenantId, id }, update);
  }

  async loadCategoryGraph(tenantId: string, categoryId: string): Promise<DocumentCategory[]> {
    const category = await this.categoryRepository.loadByQuery({ tenantId: { $or: [null, tenantId] }, id: categoryId });

    if (category.parentId == null) {
      return [category];
    }

    const parents = await this.loadCategoryGraph(tenantId, category.parentId);
    return [...parents, category];
  }

  async loadCategoriesAndTypes(tenantId: string | null): Promise<{ categories: DocumentCategory[], types: DocumentType[] }> {
    const [categories, types] = await Promise.all([
      this.categoryRepository.loadManyByQuery({ tenantId: { $or: [null, tenantId] } }, { order: 'label' }),
      this.typeRepository.loadManyByQuery({ tenantId: { $or: [null, tenantId] } }, { order: 'label' }),
    ]);

    return { categories, types };
  }

  async loadCategoryViews(tenantId: string | null): Promise<DocumentCategoryView[]> {
    const { categories, types } = await this.loadCategoriesAndTypes(tenantId);

    const categoryChildrenMap = groupToMap(categories, (category) => category.parentId);
    const categoryTypesMap = groupToMap(types, (type) => type.categoryId);

    const rootCategories = categoryChildrenMap.get(null);

    if (isUndefined(rootCategories)) {
      return [];
    }

    return rootCategories.map((category) => getView(category, categoryChildrenMap, categoryTypesMap));
  }
}

function getView(category: DocumentCategory, categoryChildrenMap: Map<string | null, DocumentCategory[]>, categoryTypesMap: Map<string, DocumentType[]>): DocumentCategoryView {
  const childCategories = categoryChildrenMap.get(category.id) ?? [];

  return {
    ...category,
    children: childCategories.map((c) => getView(c, categoryChildrenMap, categoryTypesMap)),
    types: categoryTypesMap.get(category.id) ?? [],
  };
}
