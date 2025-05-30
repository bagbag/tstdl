export type DocumentCollectionMetadata = {
  /**
   * User-friendly name of the collection
   * @example <name of person>
   * @example <address of real estate>
   */
  name: string,

  /**
   * Group of the collection, used to group multiple collections to the same "type"
   * @example 'Applicants'
   * @example 'Real estates'
   */
  group: string | null,
};
