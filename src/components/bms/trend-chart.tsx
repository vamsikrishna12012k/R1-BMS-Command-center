import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { RANGES, buildHistory, stats, toCsv, type RangeKey, type SeriesSpec } from "@/lib/bms/history";
import { cn } from "@/lib/utils";

export interface TrendSeries extends SeriesSpec {
  label: string;
  color: string;
  type?: "line" | "area" | "bar";
  unit?: string;
}

export interface Threshold {
  value: number;
  label: string;
  color: string;
}

export interface EventMarker {
  t: number;
  label: string;
  color: string;
}

function fmtTick(t: number, rangeMs: number) {
  const d = new Date(t);
  if (rangeMs <= 86_400_000)
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function TrendChart({
  deviceId,
  title,
  series,
  thresholds = [],
  markers = [],
  height = 240,
  defaultRange = "24h",
  now,
  compact = false,
}: {
  deviceId: string;
  title?: string;
  series: TrendSeries[];
  thresholds?: Threshold[];
  markers?: EventMarker[];
  height?: number;
  defaultRange?: RangeKey;
  now: number;
  compact?: boolean;
}) {
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [hidden, setHidden] = useState<string[]>([]);

  const cfg = RANGES.find((r) => r.key === range) ?? RANGES[2]!;
  const customStart = range === "custom" && custom.from ? new Date(custom.from).getTime() : undefined;
  const customEnd = range === "custom" && custom.to ? new Date(custom.to).getTime() : undefined;

  // Bucket time so charts don't re-render on every 2s tick.
  const bucket = Math.floor(now / 15_000);
  const rows = useMemo(
    () =>
      buildHistory(
        deviceId,
        series,
        cfg.ms,
        compact ? 40 : cfg.points,
        bucket * 15_000,
        customStart,
        customEnd,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deviceId, bucket, cfg.ms, cfg.points, compact, customStart, customEnd, series.map((s) => `${s.key}:${s.current}`).join("|")],
  );

  const visible = series.filter((s) => !hidden.includes(s.key));

  const download = () => {
    const csv = toCsv(rows, series.map((s) => s.key));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deviceId}-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title && <h3 className="font-display text-sm font-semibold tracking-wide">{title}</h3>}
        <div className="flex flex-wrap items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "num rounded-sm border px-1.5 py-0.5 text-[10px] tracking-wide transition-colors",
                range === r.key
                  ? "border-flow/60 bg-flow/15 text-flow"
                  : "border-line text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label.replace("Last ", "")}
            </button>
          ))}
          <button
            onClick={() => setRange("custom")}
            className={cn(
              "num rounded-sm border px-1.5 py-0.5 text-[10px] tracking-wide",
              range === "custom" ? "border-flow/60 bg-flow/15 text-flow" : "border-line text-muted-foreground hover:text-foreground",
            )}
          >
            Custom
          </button>
          <button
            onClick={download}
            title="Export CSV"
            className="num flex items-center gap-1 rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3" /> CSV
          </button>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel-2 px-2 py-1.5">
          <span className="label-xs">From</span>
          <input
            type="datetime-local"
            value={custom.from}
            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            className="num rounded-sm border border-line bg-background px-1.5 py-0.5 text-[11px]"
          />
          <span className="label-xs">To</span>
          <input
            type="datetime-local"
            value={custom.to}
            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            className="num rounded-sm border border-line bg-background px-1.5 py-0.5 text-[11px]"
          />
        </div>
      )}

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`grad-${deviceId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t: number) => fmtTick(t, cfg.ms)}
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              minTickGap={28}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
              labelFormatter={(t: number) => new Date(t).toLocaleString("en-GB")}
            />
            {series.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                onClick={(e) => {
                  const key = String((e as { dataKey?: string }).dataKey ?? "");
                  setHidden((h) => (h.includes(key) ? h.filter((x) => x !== key) : [...h, key]));
                }}
              />
            )}
            {thresholds.map((th) => (
              <ReferenceLine
                key={th.label}
                y={th.value}
                stroke={th.color}
                strokeDasharray="4 4"
                label={{ value: th.label, position: "insideTopRight", fill: th.color, fontSize: 10 }}
              />
            ))}
            {markers.map((m) => (
              <ReferenceLine key={`${m.label}-${m.t}`} x={m.t} stroke={m.color} strokeDasharray="2 3" />
            ))}
            {visible.map((s) =>
              s.type === "bar" ? (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              ) : s.type === "area" ? (
                <Area
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  fill={`url(#grad-${deviceId}-${s.key})`}
                  strokeWidth={1.6}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={1.6}
                  isAnimationActive={false}
                />
              ),
            )}
            {!compact && <Brush dataKey="t" height={16} travellerWidth={8} stroke="var(--line)" fill="var(--panel-2)" tickFormatter={() => ""} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-3">
          {series.map((s) => {
            const st = stats(rows, s.key);
            return (
              <div key={s.key} className="num flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="size-2 rounded-sm" style={{ background: s.color }} />
                <span className="text-foreground">{s.label}</span>
                <span>MIN {st.min}</span>
                <span>AVG {st.avg}</span>
                <span>MAX {st.max}</span>
                {s.unit && <span>{s.unit}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
