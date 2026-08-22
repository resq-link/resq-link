export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === 'object') {
    const candidate = value as {
      toDate?: () => Date;
      toMillis?: () => number;
      _seconds?: number;
      seconds?: number;
    };
    if (typeof candidate.toDate === 'function') {
      try {
        return candidate.toDate().toISOString();
      } catch {
        return null;
      }
    }
    if (typeof candidate.toMillis === 'function') {
      return new Date(candidate.toMillis()).toISOString();
    }
    const seconds = candidate._seconds ?? candidate.seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return null;
}

export function toMillis(value: unknown): number {
  const iso = toIso(value);
  return iso ? new Date(iso).getTime() : 0;
}
