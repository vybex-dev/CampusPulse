// Phase 0 stub: the simulated clock only. The generator arrives later.
export const SIM_START = "2026-10-12T00:00";

const g = globalThis as unknown as { __simClock?: { iso: string } };

export function getClock(): string {
  g.__simClock ??= { iso: SIM_START };
  return g.__simClock.iso;
}

export function advanceDays(days: number): string {
  const d = new Date(`${getClock()}:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  g.__simClock = { iso: d.toISOString().slice(0, 16) };
  return g.__simClock.iso;
}

export function resetClock(): string {
  g.__simClock = { iso: SIM_START };
  return SIM_START;
}

export function getDemoState() {
  return { clock: getClock(), seed: Number(process.env.SIM_SEED ?? 42) };
}
