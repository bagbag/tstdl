/* eslint-disable @typescript-eslint/naming-convention */

import type { StringMap } from '@tstdl/base/types';
import { equals } from '@tstdl/base/utils';

export type ElasticsearchIndexSettings = {
  refresh_interval?: string | number,
  number_of_shards?: number,
  number_of_replicas?: number,
  analysis?: {
    analyzer?: StringMap<ElasticsearchAnalyzer>,
    filter?: StringMap<ElasticsearchFilter>
  }
};

export type ElasticsearchCustomAnalyzerBase<Type extends string = string> = {
  type: Type
};

export type ElasticsearchCustomAnalyzer = ElasticsearchCustomAnalyzerBase<'custom'> & {
  tokenizer?: string,
  filter?: string[]
};

export type ElasticsearchAnalyzer = ElasticsearchCustomAnalyzer;

export type ElasticsearchFilterBase<Type extends string = string> = {
  type: Type
};

export type ElasticsearchStemmerFilter = ElasticsearchFilterBase<'stemmer'> & {
  language: string
};

export type ElasticsearchEdgeNGramFilter = ElasticsearchFilterBase<'edge_ngram'> & {
  min_gram?: number,
  max_gram?: number
};

export type ElasticsearchFilter = ElasticsearchStemmerFilter | ElasticsearchEdgeNGramFilter;
