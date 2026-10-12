import { z } from "zod";

export const ROLES = ["admin", "staff", "student"] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const BLOCK_CODES = [
  "AB-A",
  "AB-B",
  "LIB",
  "HST-1",
  "HST-2",
  "MESS",
] as const;
export const BlockCodeSchema = z.enum(BLOCK_CODES);
export type BlockCode = z.infer<typeof BlockCodeSchema>;

export const BLOCK_NAMES: Record<BlockCode, string> = {
  "AB-A": "Academic Block A",
  "AB-B": "Academic Block B",
  LIB: "Library and Admin",
  "HST-1": "Boys Hostel 1",
  "HST-2": "Girls Hostel",
  MESS: "Mess and Canteen",
};

export const RangeSchema = z.union([z.literal(7), z.literal(30)]);
export type Range = z.infer<typeof RangeSchema>;

export const ResourceTabSchema = z.enum([
  "all",
  "electricity",
  "water",
  "waste",
]);
export type ResourceTab = z.infer<typeof ResourceTabSchema>;

export const WasteModeSchema = z.enum(["identify", "bin_check"]);
export type WasteMode = z.infer<typeof WasteModeSchema>;

/** Every number in the product carries exactly one of these. Never mixed. */
export const TagSchema = z.enum([
  "verified",
  "estimated",
  "projected",
  "measured",
]);
export type Tag = z.infer<typeof TagSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export const DemoStateSchema = z.object({
  clock: z.string(), // ISO 8601, simulated local time, hourly resolution
  seed: z.number(),
});
export type DemoState = z.infer<typeof DemoStateSchema>;

export const FastForwardBodySchema = z.object({
  days: z.union([z.literal(1), z.literal(7)]),
});

const ProviderStatus = z.enum(["ok", "cooling_down", "unconfigured"]);
export const HealthSchema = z.object({
  providers: z.object({
    groq: z.object({
      status: ProviderStatus,
      model: z.string(),
      retry_after_s: z.number().optional(),
    }),
    gemini: z.object({
      status: ProviderStatus,
      model: z.string(),
      retry_after_s: z.number().optional(),
    }),
  }),
  sample_mode: z.boolean(),
});
export type Health = z.infer<typeof HealthSchema>;
