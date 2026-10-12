/**
 * SHA-256 hash cache in SQLite ai_cache table.
 *
 * Keeps image classification results keyed by image SHA-256 hex digest,
 * avoiding duplicate LLM vision calls for identical images.
 */
import crypto from "node:crypto";
import { type Db, getDb } from "../db";
import { type Classification, ClassificationSchema, type Provider } from "../contract";

export interface CachedClassificationEntry {
  image_hash: string;
  classification: Classification;
  provider: Provider;
  created_at: string;
}

/**
 * Calculates SHA-256 hex digest of image bytes.
 */
export function hashImage(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Retrieves cached classification if present in SQLite ai_cache.
 */
export function getCachedClassification(
  hash: string,
  db?: Db,
): CachedClassificationEntry | null {
  const database = db ?? getDb();
  try {
    const row = database
      .prepare(
        "SELECT image_hash, result_json, provider, created_at FROM ai_cache WHERE image_hash = ?",
      )
      .get(hash) as
      | {
          image_hash: string;
          result_json: string;
          provider: string;
          created_at: string;
        }
      | undefined;

    if (!row) return null;

    const parsedJson = JSON.parse(row.result_json);
    const parsedClassification = ClassificationSchema.safeParse(parsedJson);
    if (!parsedClassification.success) {
      return null;
    }

    return {
      image_hash: row.image_hash,
      classification: parsedClassification.data,
      provider: row.provider as Provider,
      created_at: row.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Stores classification in SQLite ai_cache.
 */
export function setCachedClassification(
  hash: string,
  classification: Classification,
  provider: Provider,
  db?: Db,
): void {
  const database = db ?? getDb();
  try {
    const nowIso = new Date().toISOString();
    database
      .prepare(
        `INSERT OR REPLACE INTO ai_cache (image_hash, result_json, provider, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(hash, JSON.stringify(classification), provider, nowIso);
  } catch (err) {
    console.error("Failed to write to ai_cache:", err);
  }
}

/**
 * Clears ai_cache (useful for tests).
 */
export function clearAiCache(db?: Db): void {
  const database = db ?? getDb();
  database.prepare("DELETE FROM ai_cache").run();
}
