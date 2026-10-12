const clockFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC", // simulated local time is stored as a bare ISO string; read it as-is
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-12T00:00" -> "Mon 12 Oct 00:00" */
export function formatSimClock(iso: string): string {
  return clockFormat.format(new Date(`${iso}:00Z`)).replace(/,/g, "");
}
