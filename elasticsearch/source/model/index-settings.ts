/* eslint-disable @typescript-eslint/naming-convention */

import type { StringMap } from '@tstdl/base/types';

export type ElasticIndexSettings = {
  refresh_interval?: string | number,
  number_of_shards?: number,
  number_of_replicas?: number,
  analysis?: {
    analyzer?: StringMap<ElasticAnalyzer>,
    filter?: StringMap<ElasticFilter>
  }
};

export type ElasticCustomAnalyzerBase<Type extends string = string> = {
  type: Type
};

export type ElasticCustomAnalyzer = ElasticCustomAnalyzerBase<'custom'> & {
  tokenizer?: string,
  filter?: string[]
};

export type ElasticAnalyzer = ElasticCustomAnalyzer;

export type ElasticFilterBase<Type extends string = string> = {
  type: Type
};

export type ElasticStemmerFilter = ElasticFilterBase<'stemmer'> & {
  language: string
};

export type ElasticEdgeNGramFilter = ElasticFilterBase<'edge_ngram'> & {
  min_gram?: number,
  max_gram?: number
};

export type ElasticFilter = ElasticStemmerFilter | ElasticEdgeNGramFilter;
