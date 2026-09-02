import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { nf, stamp } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Meridian BMS" },
      { name: "description", content: "Generate and export energy, UPS availability, HVAC performance and alarm summary reports as CSV." },
      { property: "og:title", content: "Reports — Meridian BMS" },
      { property: "og:description", content: "Export operational reports for energy, UPS, HVAC and alarms." },
    ],
  }),
  component: ReportsPage,
});

type Kind = "energy" | "ups" | "hvac" | "alarms";

function download(name: string, rows: string[][]) {
  const csv = rows.map((r) => r.join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const s = useBms();
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");

  const defs: { kind: Kind; title: string; detail: string; rows: () => string[][] }[] = [
    {
      kind: "energy",
      title: "Energy Consumption",
      detail: `${s.meters.length} metering points · kWh, demand and power factor`,
      rows: () => [
        ["meter", "building", "kW", "kWh", "peak kW", "power factor"],
        ...s.meters.map((m) => [m.name, m.site.building, nf(m.kw, 1), nf(m.kwh, 0), nf(m.peakLoadKw, 1), nf(m.powerFactor, 3)]),
      ],
    },
    {
      kind: "ups",
      title: "UPS Availability",
      detail: `${s.ups.length} units · load, autonomy and battery health`,
      rows: () => [
        ["unit", "location", "mode", "load %", "runtime min", "battery %", "battery health %", "state"],
        ...s.ups.map((u) => [u.name, `${u.site.building} ${u.site.room}`, u.mode, nf(u.loadPct, 1), nf(u.runtimeMin, 0), nf(u.batteryPct, 1), nf(u.batteryHealthPct, 1), u.severity]),
      ],
    },
    {
      kind: "hvac",
      title: "HVAC Performance",
      detail: `${s.ahus.length} AHUs · ${s.vavs.length} VAVs · ${s.cassettes.length} cassettes`,
      rows: () => [
        ["equipment", "type", "location", "setpoint", "measured", "state"],
        ...s.ahus.map((a) => [a.name, "AHU", `${a.site.building} ${a.site.floor}`, nf(a.setpointC, 1), nf(a.supplyTempC, 1), a.running ? "running" : "stopped"]),
        ...s.cassettes.map((c) => [c.name, "Cassette", `${c.site.building} ${c.site.room}`, nf(c.setpointC, 1), nf(c.roomTempC, 1), c.on ? "on" : "off"]),
      ],
    },
    {
      kind: "alarms",
      title: "Alarm Summary",
      detail: `${s.alarms.length} events recorded · severity and lifecycle state`,
      rows: () => [
        ["raised", "equipment", "type", "severity", "state", "description"],
        ...s.alarms.map((a) => [stamp(a.raisedAt), a.equipmentName, a.equipmentType, a.severity, a.state, `"${a.description}"`]),
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Intelligence"
        title="Reports"
        right={
          <div className="flex gap-1">
            {(["24h", "7d", "30d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px]",
                  period === p ? "border-primary bg-primary text-primary-foreground" : "border-line hover:bg-accent",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Reporting Period" value={period.toUpperCase()} hint={`Generated ${stamp(s.now)}`} />
        <Metric label="Total Consumption" value={nf(s.meters.reduce((n, m) => n + m.kwh, 0), 0)} unit="kWh" />
        <Metric label="Alarm Events" value={s.alarms.length} />
        <Metric label="Devices Reported" value={s.ups.length + s.ahus.length + s.vavs.length + s.cassettes.length + s.meters.length + s.panels.length} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {defs.map((d) => (
          <Panel key={d.kind} title={d.title} subtitle={d.detail}>
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent">
                <FileText className="size-5 text-primary" />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Snapshot over the last {period}, exported as a comma-separated file suitable for Excel or a reporting pipeline.
              </p>
              <button
                onClick={() => {
                  download(`bms-${d.kind}-${period}.csv`, d.rows());
                  toast.success(`${d.title} report exported`);
                }}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground"
              >
                <Download className="size-3.5" /> CSV
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
