/**
 * This can be used in the request context to indicate that the request should not be cached.
 * HttpClientAdapters should check for this token and bypass any caching mechanisms if it is present.
 */
export const bustCache = 'bustCache';
