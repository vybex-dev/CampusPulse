import { describe, expect, it } from "vitest";
import {
  MAD_SCALE,
  groupBy,
  mad,
  median,
  rollingWindow,
  scaledMad,
} from "@/lib/stats";

describe("median", () => {
  it("handles odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });

  it("sorts numerically, not as strings", () => {
    expect(median([10, 9, 100])).toBe(10);
  });

  it("does not mutate its input", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it("returns NaN for empty input", () => {
    expect(median([])).toBeNaN();
  });
});

describe("mad and scaledMad", () => {
  it("computes the MAD for an odd count", () => {
    // median 2; deviations 1,1,0,0,2,4,7 -> median 1
    expect(mad([1, 1, 2, 2, 4, 6, 9])).toBe(1);
  });

  it("computes the MAD for an even count", () => {
    // median 2.5; deviations 1.5,0.5,0.5,1.5 -> median 1
    expect(mad([1, 2, 3, 4])).toBe(1);
  });

  it("scales by 1.4826", () => {
    expect(MAD_SCALE).toBe(1.4826);
    expect(scaledMad([1, 2, 3, 4])).toBeCloseTo(1.4826, 10);
  });

  it("is robust to a minority of outliers", () => {
    expect(median([10, 10, 10, 10, 100])).toBe(10);
    expect(mad([10, 10, 10, 10, 100])).toBe(0);
  });

  it("returns NaN for empty input", () => {
    expect(mad([])).toBeNaN();
    expect(scaledMad([])).toBeNaN();
  });
});

describe("rollingWindow", () => {
  const sum = (w: readonly number[]) => w.reduce((a, b) => a + b, 0);

  it("returns only full windows by default", () => {
    expect(rollingWindow([1, 2, 3, 4, 5], 3, sum)).toEqual([6, 9, 12]);
  });

  it("includes shorter leading windows on request, aligned to each index", () => {
    expect(
      rollingWindow([1, 2, 3, 4, 5], 3, sum, { includePartial: true }),
    ).toEqual([1, 3, 6, 9, 12]);
  });

  it("passes the end index of each window", () => {
    expect(rollingWindow([5, 6, 7], 2, (_w, end) => end)).toEqual([1, 2]);
  });

  it("returns no windows when size exceeds the length", () => {
    expect(rollingWindow([1, 2], 3, sum)).toEqual([]);
    expect(rollingWindow([1, 2], 3, sum, { includePartial: true })).toEqual([
      1, 3,
    ]);
  });

  it("rejects an invalid size", () => {
    expect(() => rollingWindow([1], 0, sum)).toThrow(RangeError);
    expect(() => rollingWindow([1], 1.5, sum)).toThrow(RangeError);
  });
});

describe("groupBy", () => {
  it("groups items and preserves first-seen key order", () => {
    const groups = groupBy([1, 2, 3, 4, 5], (n) =>
      n % 2 === 0 ? "even" : "odd",
    );
    expect([...groups.keys()]).toEqual(["odd", "even"]);
    expect(groups.get("odd")).toEqual([1, 3, 5]);
    expect(groups.get("even")).toEqual([2, 4]);
  });

  it("supports numeric keys such as hour_of_week", () => {
    const rows = [
      { how: 19, v: 1 },
      { how: 20, v: 2 },
      { how: 19, v: 3 },
    ];
    const groups = groupBy(rows, (r) => r.how);
    expect(groups.get(19)?.map((r) => r.v)).toEqual([1, 3]);
  });

  it("returns an empty map for no items", () => {
    expect(groupBy([], () => "x").size).toBe(0);
  });
});
