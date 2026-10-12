/**
 * Rate limiter, token bucket, and provider cooldown manager for CampusPulse.
 *
 * Requirements:
 * - Token bucket: ~2.5K tokens per scan, 8K/min capacity.
 * - Park Groq/Gemini on 429 for retry-after seconds (default 60 s).
 * - Route-level rate limiter: 20 req/min for POST /api/waste/classify.
 */
import type { Provider } from "../contract";

interface CooldownEntry {
  untilMs: number;
}

interface TokenBucket {
  capacity: number; // 8000
  tokens: number;
  lastRefillMs: number;
  refillRatePerMs: number; // 8000 tokens / 60,000 ms = 0.1333 tokens/ms
}

const DEFAULT_BUCKET_CAPACITY = 8000;
const TOKENS_PER_MINUTE = 8000;
export const TOKENS_PER_SCAN = 2500;

// In-memory state preserved across requests in the single Node process
const cooldowns = new Map<Provider, CooldownEntry>();
const buckets = new Map<Provider, TokenBucket>();
const routeHits = new Map<string, { count: number; resetMs: number }>();

function getOrCreateBucket(provider: Provider): TokenBucket {
  let b = buckets.get(provider);
  if (!b) {
    b = {
      capacity: DEFAULT_BUCKET_CAPACITY,
      tokens: DEFAULT_BUCKET_CAPACITY,
      lastRefillMs: Date.now(),
      refillRatePerMs: TOKENS_PER_MINUTE / 60000,
    };
    buckets.set(provider, b);
  }
  return b;
}

function refillBucket(b: TokenBucket): void {
  const now = Date.now();
  const elapsed = Math.max(0, now - b.lastRefillMs);
  b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillRatePerMs);
  b.lastRefillMs = now;
}

/**
 * Park a provider for a cooldown period (e.g. following a 429).
 */
export function parkProvider(provider: Provider, seconds = 60): void {
  const untilMs = Date.now() + Math.max(1, seconds) * 1000;
  cooldowns.set(provider, { untilMs });
}

/**
 * Check if a provider is currently cooling down.
 */
export function isProviderCoolingDown(provider: Provider): boolean {
  const entry = cooldowns.get(provider);
  if (!entry) return false;
  if (Date.now() >= entry.untilMs) {
    cooldowns.delete(provider);
    return false;
  }
  return true;
}

/**
 * Returns remaining cooldown in seconds, or 0 if not cooling down.
 */
export function getProviderCooldownRemaining(provider: Provider): number {
  const entry = cooldowns.get(provider);
  if (!entry) return 0;
  const remainingMs = entry.untilMs - Date.now();
  if (remainingMs <= 0) {
    cooldowns.delete(provider);
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

/**
 * Reset provider cooldown (mainly for tests).
 */
export function resetProviderCooldown(provider?: Provider): void {
  if (provider) {
    cooldowns.delete(provider);
  } else {
    cooldowns.clear();
  }
}

/**
 * Consume tokens from provider's bucket. Returns true if allowed, false if exhausted.
 */
export function consumeTokens(provider: Provider, tokens: number = TOKENS_PER_SCAN): boolean {
  const b = getOrCreateBucket(provider);
  refillBucket(b);
  if (b.tokens >= tokens) {
    b.tokens -= tokens;
    return true;
  }
  return false;
}

/**
 * Returns current available token balance for provider.
 */
export function getAvailableTokens(provider: Provider): number {
  const b = getOrCreateBucket(provider);
  refillBucket(b);
  return Math.floor(b.tokens);
}

/**
 * Reset token bucket (mainly for tests).
 */
export function resetTokenBucket(provider?: Provider): void {
  if (provider) {
    buckets.delete(provider);
  } else {
    buckets.clear();
  }
}

/**
 * In-memory sliding window rate limiter for routes (e.g. 20 req/min for POST /api/waste/classify).
 */
export function checkRouteRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60000,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let record = routeHits.get(key);

  if (!record || now >= record.resetMs) {
    record = { count: 1, resetMs: now + windowMs };
    routeHits.set(key, record);
    return { allowed: true, remaining: maxRequests - 1, resetMs: record.resetMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetMs: record.resetMs };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetMs: record.resetMs };
}

export function resetRouteRateLimit(): void {
  routeHits.clear();
}
