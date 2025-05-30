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

  async loadCategory(id: string): Promise<DocumentCategory> {
    return await this.categoryRepository.load(id);
  }

  async loadType(id: string): Promise<DocumentType> {
    return await this.typeRepository.load(id);
  }

  async createCategory(label: string, parentId: string | null, enumKey?: string): Promise<DocumentCategory> {
    return await this.categoryRepository.insert({ label, parentId, metadata: { attributes: { [enumTypeKey]: enumKey } } });
  }

  async createType(label: string, categoryId: string, enumKey?: string): Promise<DocumentType> {
    return await this.typeRepository.insert({ label, categoryId, metadata: { attributes: { [enumTypeKey]: enumKey } } });
  }

  async updateCategory(id: string, update: { label?: string, parentId?: string | null }): Promise<DocumentCategory> {
    return await this.categoryRepository.update(id, update);
  }

  async updateType(id: string, update: { label?: string, categoryId?: string }): Promise<DocumentType> {
    return await this.typeRepository.update(id, update);
  }

  async loadCategoryGraph(categoryId: string): Promise<DocumentCategory[]> {
    const category = await this.categoryRepository.load(categoryId);

    if (category.parentId == null) {
      return [category];
    }

    const parents = await this.loadCategoryGraph(category.parentId);
    return [...parents, category];
  }

  async loadCategoriesAndTypes(): Promise<{ categories: DocumentCategory[], types: DocumentType[] }> {
    const [categories, types] = await Promise.all([
      this.categoryRepository.loadManyByQuery({}, { order: 'label' }),
      this.typeRepository.loadManyByQuery({}, { order: 'label' }),
    ]);

    return { categories, types };
  }

  async loadCategoryViews(): Promise<DocumentCategoryView[]> {
    const { categories, types } = await this.loadCategoriesAndTypes();

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
