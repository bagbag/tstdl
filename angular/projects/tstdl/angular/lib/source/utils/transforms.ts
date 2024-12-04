import { isNull } from '@tstdl/base/utils';

export function numberTransform(value: any): number | null {
  if (isNull(value)) {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  return number;
}

export function booleanTransform(value: any): boolean | null {
  if ((value === true) || (value === 'true') || (value === 1)) {
    return true;
  }

  if ((value === false) || (value === 'false') || (value === 0)) {
    return false;
  }

  return null;
}

export function numberTransformWithFallback<F>(fallback: F): (value: any) => number | F {
  return (value: any) => numberTransform(value) ?? fallback;
}

export function booleanTransformWithFallback<F>(fallback: F): (value: any) => boolean | F {
  return (value: any) => booleanTransform(value) ?? fallback;
}
