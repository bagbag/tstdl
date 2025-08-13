import type { Record } from '#/types/index.js';
import { fromEntries } from '../utils/object/object.js';

const extractPattern = /^(?<mimeType>[^#]\S+)\t+(?<extensions>[\w ]+)$/ugm;

async function fetchMimeTypes(): Promise<Record<string, string[]>> {
  const response = await fetch('https://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types');

  if (response.status != 200) {
    throw new Error(response.statusText);
  }

  const raw = await response.text();
  const matches = raw.matchAll(extractPattern);
  const entries = [...matches].map(({ groups }) => ([groups!['mimeType']!, groups!['extensions']!.split(' ')] as const));

  return fromEntries(entries);
}

const types = await fetchMimeTypes();

console.log(types);
