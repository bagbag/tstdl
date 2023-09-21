/**
 * Create and consume HTTP APIs
 *
 * It has built-in support for validation and error handling.
 *
 * This module contains types and functions to define and register apis and error handlers.
 *
 * Consumers of these definitions are [client](api_client.html) and [server](api_server.html).
 *
 * Examples can be found in `source/examples/api/`.
 *
 * @module API
 */

export * from './client/index.js';
export * from './default-error-handlers.js';
export * from './response.js';
export * from './server/index.js';
export * from './types.js';
