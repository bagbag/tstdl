/**
 * Module for creating and consuming HTTP apis with built-in support for validation and error handling.
 *
 * This module contains types and functions to define and register apis and error handlers.
 *
 * Consumers of these definitions are [client](api_client.html) and [server](api_server.html).
 *
 * A basic example with a working minimal api server and client can be found in `source/examples/api/basic-overview.ts`
 *
 * @module
 */

export * from './default-error-handlers';
export * from './response';
export * from './types';
