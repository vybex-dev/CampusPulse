/**
 * Deterministic pseudo-random number generation for CampusPulse.
 * Implements mulberry32 with one stream per meter-day seeded from (baseSeed + meterId + date).
 */

/**
 * 32-bit Mulberry32 PRNG.
 * Returns a function yielding numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a combination of base seed, stream ID (e.g. meter ID), and date (YYYY-MM-DD)
 * into an unsigned 32-bit integer seed for mulberry32.
 */
export function hashSeed(baseSeed: number, streamId: string, date: string): number {
  let h = (baseSeed ^ 0x811c9dc5) >>> 0;
  const key = `${streamId}:${date}`;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Create a deterministic PRNG for a single stream-day.
 */
export function createRng(baseSeed: number, streamId: string, date: string): () => number {
  return mulberry32(hashSeed(baseSeed, streamId, date));
}

/**
 * Box-Muller transform for generating Gaussian random numbers with given mean and standard deviation.
 */
export function normalRandom(rng: () => number, mean = 0, sd = 1): number {
  let u1 = rng();
  while (u1 <= 1e-7) u1 = rng();
  const u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * sd;
}
