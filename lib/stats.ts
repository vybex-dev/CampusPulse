/**
 * Small robust-statistics helpers (no dependencies). Pure functions.
 * Empty input returns NaN for median, mad and scaledMad: callers must check for it.
 */

/** Makes the MAD comparable to a standard deviation for normally distributed data. */
export const MAD_SCALE = 1.4826;

export function median(values: readonly number[]): number {
  const n = values.length;
  if (n === 0) return NaN;
  const sorted = Float64Array.from(values).sort(); // typed-array sort is numeric
  const mid = n >> 1;
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Median absolute deviation from the median. */
export function mad(values: readonly number[]): number {
  const m = median(values);
  return median(values.map((v) => Math.abs(v - m)));
}

/** 1.4826 x MAD: a robust stand-in for the standard deviation. */
export function scaledMad(values: readonly number[]): number {
  return MAD_SCALE * mad(values);
}

/**
 * Apply fn to sliding windows of `size` items.
 * Default: only full windows, so result[k] is the window ending at index k + size - 1.
 * With includePartial, the first windows are shorter and result[i] is the window ending at i.
 * fn receives the window and the index of its last item.
 */
export function rollingWindow<T, R>(
  values: readonly T[],
  size: number,
  fn: (window: readonly T[], endIndex: number) => R,
  options: { includePartial?: boolean } = {},
): R[] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(
      `rollingWindow: size must be a positive integer, got ${size}`,
    );
  }
  const out: R[] = [];
  const first = options.includePartial ? 0 : size - 1;
  for (let end = first; end < values.length; end++) {
    const start = Math.max(0, end - size + 1);
    out.push(fn(values.slice(start, end + 1), end));
  }
  return out;
}

/** Group items by key. A Map keeps insertion order and works for numeric keys (hour_of_week). */
export function groupBy<T, K>(
  items: readonly T[],
  keyFn: (item: T, index: number) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  items.forEach((item, index) => {
    const key = keyFn(item, index);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  });
  return groups;
}
