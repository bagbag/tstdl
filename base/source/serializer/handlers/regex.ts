type RegExpData = {
  pattern: string,
  flags: string
};

export function serializeRegExp(regex: RegExp): RegExpData {
  return {
    pattern: regex.source,
    flags: regex.flags
  };
}

export function deserializeRegExp(data: RegExpData): RegExp {
  return new RegExp(data.pattern, data.flags);
}
