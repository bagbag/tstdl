export abstract class DocumentManagementAuthorizationService<Token = unknown> {
  /**
   * Gets the tenant from the request token.
   * @param token The token of the request
   */
  abstract getTenantId(token?: Token): string | Promise<string>;

  /**
   * Gets the subject from the request token.
   * @param token The token of the request
   */
  abstract getSubject(token?: Token): string | Promise<string>;

  /**
   * Checks if a user can read/view a specific document collection and its documents.
   * @param collectionId The ID of the document collection.
   * @param token The token of the request
   */
  abstract canReadCollection(collectionId: string, token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can create new *unassigned* documents (lands in "inbox", which then require assigning to request/collection) in a specific collection.
   * @param collectionId The ID of the document collection.
   * @param token The token of the request.
   */
  abstract canCreateDocuments(collectionId: string, token?: Token): boolean | Promise<boolean>;

  abstract canDeleteDocuments(collectionId: string, token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can assign documents to requests in the collection or directly to the collection.
   * @param collectionId The ID of the document collection.
   * @param token The token of the request.
   */
  abstract canAssignDocuments(collectionId: string, token?: Token): boolean | Promise<boolean>;

  abstract canUpdateDocument(collectionId: string, token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can approve a specific document. This implicitly allows fulfilling document requests by approving their linked document.
   * This is usually a privileged action for staff members.
   * @param documentId The ID of the document.
   * @param token The token of the request
   * @returns A promise that resolves to true if approval is allowed, false otherwise.
   */
  abstract canApproveDocument(documentId: string, token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can reject a specific document.
   * This is usually a privileged action for staff members, often an alternative to approval.
   * @param documentId The ID of the document.
   * @param token The token of the request.
   * @returns A promise that resolves to true if rejection is allowed, false otherwise.
   */
  abstract canRejectDocument(documentId: string, token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can create, update, delete requests and assign documents to them in a collection.
   * @param collectionId The ID of the document collection.
   * @param token The token of the request
   */
  abstract canManageRequests(collectionId: string, token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can manage document categories, types and their properties (create, update, delete).
   * Typically an administrator function.
   * @param token The token of the request.
   */
  abstract canManageCategoriesAndTypes(token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can read document request templates.
   * @param token The token of the request.
   */
  abstract canReadDocumentRequestsTemplates(token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can manage document request templates (create, update, delete).
   * Typically an administrator function.
   * @param token The token of the request.
   */
  abstract canManageDocumentRequestsTemplates(token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can manage document validation definitions and their assignment to types.
   * Typically an administrator function.
   * @param token The token of the request.
   */
  abstract canManageValidationDefinitions(token?: Token): boolean | Promise<boolean>;

  /**
   * Checks if a user can progress a document through its workflow.
   * This implies reviewing the current step's output, making corrections if necessary,
   * and then confirming to proceed to the next phase or finalization.
   * @param documentId The ID of the document.
   * @param token The token of the request.
   */
  abstract canProgressDocumentWorkflow(documentId: string, token?: Token): boolean | Promise<boolean>;
}
