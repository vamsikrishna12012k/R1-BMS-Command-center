import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { TrendChart } from "@/components/bms/trend-chart";
import { nf } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Trends — R1 BMS Command Center" },
      { name: "description", content: "Cross-system analytics: compare energy, UPS load and HVAC performance over configurable time ranges with CSV export." },
      { property: "og:title", content: "Analytics & Trends — R1 BMS Command Center" },
      { property: "og:description", content: "Compare building systems over time with exportable trend analysis." },
    ],
  }),
  component: AnalyticsPage,
});

type Tab = "energy" | "ups" | "hvac";

function AnalyticsPage() {
  const s = useBms();
  const [tab, setTab] = useState<Tab>("energy");
  const main = s.meters[0]!;
  const ups = s.ups[0]!;
  const ahu = s.ahus[0]!;

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Intelligence"
        title="Analytics & Trends"
        right={
          <div className="flex gap-1">
            {(["energy", "ups", "hvac"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] capitalize",
                  tab === t ? "border-primary bg-primary text-primary-foreground" : "border-line hover:bg-accent",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Peak Demand" value={nf(main.peakLoadKw, 0)} unit="kW" />
        <Metric label="Load Factor" value={nf((main.kw / Math.max(main.peakLoadKw, 1)) * 100, 1)} unit="%" />
        <Metric label="Fleet UPS Load" value={nf(s.ups.reduce((n, u) => n + u.loadPct, 0) / s.ups.length, 1)} unit="%" />
        <Metric label="Avg Supply Air" value={nf(s.ahus.reduce((n, a) => n + a.supplyTempC, 0) / s.ahus.length, 1)} unit="°C" />
      </div>

      {tab === "energy" && (
        <Panel title="Energy Comparison" subtitle="Main incomer vs. sub-metering">
          <TrendChart
            deviceId="ANALYTICS-ENERGY"
            now={s.now}
            height={300}
            defaultRange="7d"
            series={[
              { key: "main", label: main.name, color: "var(--chart-1)", current: main.kw, amplitude: 80, min: 0, type: "area", unit: "kW" },
              ...s.meters.slice(1, 4).map((m, i) => ({
                key: m.id,
                label: m.name,
                color: `var(--chart-${i + 2})`,
                current: m.kw,
                amplitude: 30,
                min: 0,
                unit: "kW",
              })),
            ]}
          />
        </Panel>
      )}

      {tab === "ups" && (
        <Panel title="UPS Fleet Comparison" subtitle="Load percentage per unit">
          <TrendChart
            deviceId="ANALYTICS-UPS"
            now={s.now}
            height={300}
            defaultRange="24h"
            series={s.ups.slice(0, 5).map((u, i) => ({
              key: u.id,
              label: u.name,
              color: `var(--chart-${(i % 5) + 1})`,
              current: u.loadPct,
              amplitude: 10,
              min: 0,
              max: 100,
              unit: "%",
            }))}
            thresholds={[{ value: 90, label: "Overload", color: "var(--sev-warn)" }]}
          />
          <p className="mt-2 text-[12px] text-muted-foreground">
            Highest sustained load: <span className="num">{[...s.ups].sort((a, b) => b.loadPct - a.loadPct)[0]!.name}</span> at{" "}
            <span className="num">{nf([...s.ups].sort((a, b) => b.loadPct - a.loadPct)[0]!.loadPct, 1)}%</span>. Battery autonomy on the weakest string is{" "}
            <span className="num">{nf([...s.ups].sort((a, b) => a.runtimeMin - b.runtimeMin)[0]!.runtimeMin, 0)} min</span>.
          </p>
        </Panel>
      )}

      {tab === "hvac" && (
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="Air Temperatures" subtitle={ahu.name}>
            <TrendChart
              deviceId="ANALYTICS-HVAC-T"
              now={s.now}
              height={260}
              series={[
                { key: "supply", label: "Supply", color: "var(--chart-1)", current: ahu.supplyTempC, amplitude: 1.5, type: "area", unit: "°C" },
                { key: "return", label: "Return", color: "var(--chart-3)", current: ahu.returnTempC, amplitude: 1.8, unit: "°C" },
              ]}
            />
          </Panel>
          <Panel title="Airflow & Fan Power" subtitle="All air handling units">
            <TrendChart
              deviceId="ANALYTICS-HVAC-F"
              now={s.now}
              height={260}
              series={[
                { key: "flow", label: "Total Airflow", color: "var(--chart-2)", current: s.ahus.reduce((n, a) => n + a.airflowCmh, 0), amplitude: 2500, min: 0, type: "area", unit: "m³/h" },
                { key: "kw", label: "Fan Power", color: "var(--chart-4)", current: s.ahus.reduce((n, a) => n + a.powerKw, 0), amplitude: 6, min: 0, unit: "kW" },
              ]}
            />
          </Panel>
        </div>
      )}

      <Panel title="UPS Load vs Building Demand" subtitle="Correlation view">
        <TrendChart
          deviceId="ANALYTICS-CORR"
          now={s.now}
          height={260}
          defaultRange="24h"
          series={[
            { key: "demand", label: "Building Demand", color: "var(--chart-1)", current: main.kw, amplitude: 70, min: 0, unit: "kW" },
            { key: "upsload", label: `${ups.name} Load`, color: "var(--chart-5)", current: ups.loadPct, amplitude: 10, min: 0, max: 100, unit: "%" },
          ]}
        />
      </Panel>
    </div>
  );
}
