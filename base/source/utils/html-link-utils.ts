import { NotFoundError } from '#/errors/not-found.error.js';
import { isNull } from './type-guards.js';

/**
 * Dynamically set a webmanifest
 * Note: The link-element has to be statically added (href can be empty), otherwise it wont work.
 */
export function setWebManifest(linkSelector: string, manifest: object): void {
  const link = document.querySelector(linkSelector);

  if (isNull(link)) {
    throw new NotFoundError(`Link element "${linkSelector}" not found.`);
  }

  const manifestString = JSON.stringify(manifest);
  const blob = new Blob([manifestString], { type: 'application/json' });
  const manifestURL = URL.createObjectURL(blob);

  link.setAttribute('href', manifestURL);
}
