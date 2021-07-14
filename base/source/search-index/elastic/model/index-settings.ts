/* eslint-disable @typescript-eslint/naming-convention */

import type { StringMap } from '#/types';

export type ElasticIndexSettings = {
  refresh_interval?: string | number,
  number_of_shards?: number,
  number_of_replicas?: number,
  max_ngram_diff?: number,
  analysis?: {
    analyzer?: StringMap<ElasticAnalyzer>,
    tokenizer?: StringMap<ElasticTokenizer>,
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
  max_gram?: number,
  preserve_original?: boolean
};

export type ElasticLengthFilter = ElasticFilterBase<'length'> & {
  min?: number,
  max?: number
};

export type ElasticFilter = ElasticStemmerFilter | ElasticEdgeNGramFilter | ElasticLengthFilter;

export type ElasticTokenizerBase<Type extends string> = {
  type: Type
};

export type ElasticNGramTokenizer = ElasticTokenizerBase<'ngram'> & {
  min_gram?: number,
  max_gram?: number,
  token_chars?: ('letter' | 'digit' | 'whitespace' | 'punctuation' | 'symbol' | 'custom')[],
  custom_token_chars?: string
};

export type ElasticTokenizer = ElasticNGramTokenizer;
