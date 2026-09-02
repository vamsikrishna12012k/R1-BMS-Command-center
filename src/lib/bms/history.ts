import { hashString, mulberry32 } from "./seed";

export type RangeKey = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

export const RANGES: { key: RangeKey; label: string; ms: number; points: number }[] = [
  { key: "1h", label: "Last 1 Hour", ms: 3_600_000, points: 60 },
  { key: "6h", label: "Last 6 Hours", ms: 21_600_000, points: 72 },
  { key: "24h", label: "Last 24 Hours", ms: 86_400_000, points: 96 },
  { key: "7d", label: "Last 7 Days", ms: 604_800_000, points: 84 },
  { key: "30d", label: "Last 30 Days", ms: 2_592_000_000, points: 90 },
];

export interface Sample {
  t: number;
  [series: string]: number;
}

export interface SeriesSpec {
  key: string;
  /** current live value the synthetic history converges to */
  current: number;
  amplitude: number;
  min?: number;
  max?: number;
  /** daily cycle strength 0..1 */
  daily?: number;
}

/**
 * Deterministic synthetic telemetry history that lands exactly on the live value.
 * Swapping simulation for a real historian only means replacing this function.
 */
export function buildHistory(
  deviceId: string,
  specs: SeriesSpec[],
  rangeMs: number,
  points: number,
  now: number,
  customStart?: number,
  customEnd?: number,
): Sample[] {
  const end = customEnd ?? now;
  const start = customStart ?? end - rangeMs;
  const span = Math.max(end - start, 60_000);
  const step = span / points;
  const out: Sample[] = [];
  for (let i = 0; i <= points; i++) {
    const t = start + i * step;
    const row: Sample = { t };
    for (const spec of specs) {
      const rand = mulberry32(hashString(`${deviceId}:${spec.key}:${Math.floor(t / step)}`));
      const noise = (rand() - 0.5) * spec.amplitude;
      const dayPhase = ((t % 86_400_000) / 86_400_000) * Math.PI * 2;
      const daily = Math.sin(dayPhase - Math.PI / 2) * spec.amplitude * 2 * (spec.daily ?? 0.6);
      const slow = Math.sin(t / (span / 6)) * spec.amplitude * 1.2;
      const converge = i / points; // last point equals the live value
      const value = spec.current + (1 - converge) * (noise + daily + slow);
      const lo = spec.min ?? -Infinity;
      const hi = spec.max ?? Infinity;
      row[spec.key] = Math.round(Math.min(hi, Math.max(lo, value)) * 100) / 100;
    }
    out.push(row);
  }
  return out;
}

export function stats(rows: Sample[], key: string) {
  const values = rows.map((r) => r[key] ?? 0);
  if (!values.length) return { min: 0, max: 0, avg: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100, avg: Math.round(avg * 100) / 100 };
}

export function toCsv(rows: Sample[], keys: string[]) {
  const header = ["timestamp", ...keys].join(",");
  const body = rows
    .map((r) => [new Date(r.t).toISOString(), ...keys.map((k) => r[k] ?? "")].join(","))
    .join("\n");
  return `${header}\n${body}`;
}
