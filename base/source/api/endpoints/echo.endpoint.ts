import type { EndpointHandler } from '../endpoint';

export const echoEndpoint: EndpointHandler<unknown, unknown, unknown> = (parameters) => parameters;
