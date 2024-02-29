const partsPattern = /[A-Z]+[a-z\d]*|[a-z\d]+/ug;

export function toTitleCase(value: string): string {
  const matches = [...value.matchAll(partsPattern)];

  return matches
    .map((match) => match[0])
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}
