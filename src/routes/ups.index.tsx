import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric, Bar } from "@/components/bms/panel";
import { CommBadge, SEV_ORDER, SEV_TEXT, SeverityBadge, StatusLamp } from "@/components/bms/severity";
import { nf, since } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ups/")({
  head: () => ({
    meta: [
      { title: "UPS Fleet — R1 BMS Command Center" },
      {
        name: "description",
        content:
          "Monitor the uninterruptible power supply fleet: load, battery autonomy, operating mode and faults for every unit.",
      },
      { property: "og:title", content: "UPS Fleet — R1 BMS Command Center" },
      { property: "og:description", content: "Live UPS fleet monitoring with load, battery and fault status." },
    ],
  }),
  component: UpsFleet,
});

function UpsFleet() {
  const s = useBms();
  const [sortKey, setSortKey] = useState<"severity" | "load" | "battery" | "name">("severity");
  const [filter, setFilter] = useState<"all" | "alarm" | "battery" | "offline">("all");

  const units = useMemo(() => {
    let list = [...s.ups];
    if (filter === "alarm") list = list.filter((u) => u.severity !== "normal" && u.severity !== "info");
    if (filter === "battery") list = list.filter((u) => u.mode === "battery");
    if (filter === "offline") list = list.filter((u) => u.comm === "offline");
    list.sort((a, b) => {
      if (sortKey === "load") return b.loadPct - a.loadPct;
      if (sortKey === "battery") return a.batteryPct - b.batteryPct;
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
    });
    return list;
  }, [s.ups, sortKey, filter]);

  const totalKw = s.ups.reduce((n, u) => n + u.outputPowerKw, 0);
  const avgLoad = s.ups.reduce((n, u) => n + u.loadPct, 0) / s.ups.length;
  const onBattery = s.ups.filter((u) => u.mode === "battery").length;
  const onBypass = s.ups.filter((u) => u.mode === "bypass").length;

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Critical Power"
        title="UPS Systems"
        right={
          <div className="flex flex-wrap items-center gap-1">
            {(["all", "alarm", "battery", "offline"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "border-line text-muted-foreground hover:bg-accent",
                )}
              >
                {f}
              </button>
            ))}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="ml-1 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px]"
              aria-label="Sort units"
            >
              <option value="severity">Sort: Severity</option>
              <option value="load">Sort: Load</option>
              <option value="battery">Sort: Battery</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Fleet Output" value={nf(totalKw, 0)} unit="kW" tone="text-flow" hint={`${s.ups.length} units installed`} />
        <Metric label="Average Load" value={nf(avgLoad, 1)} unit="%" />
        <Metric label="On Battery" value={onBattery} tone={onBattery ? "text-warn" : undefined} hint="Utility failure transfer" />
        <Metric label="On Bypass" value={onBypass} tone={onBypass ? "text-major" : undefined} hint="Unprotected load" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {units.map((u) => (
          <Link key={u.id} to="/ups/$id" params={{ id: u.id }} className="block">
            <Panel
              title={u.name}
              subtitle={`${u.site.building} · ${u.site.room} · ${u.capacityKva} kVA`}
              right={<SeverityBadge severity={u.severity} />}
              className="h-full transition-shadow hover:shadow-lg"
            >
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Load" value={u.comm === "offline" ? "—" : nf(u.loadPct, 0)} unit="%" tone={u.loadPct > 88 ? "text-warn" : "text-flow"} />
                <Metric label="Output" value={u.comm === "offline" ? "—" : nf(u.outputPowerKw, 1)} unit="kW" />
                <Metric
                  label="Battery"
                  value={u.comm === "offline" ? "—" : nf(u.batteryPct, 0)}
                  unit="%"
                  tone={u.batteryPct < 40 ? "text-warn" : "text-ok"}
                  hint={`${nf(u.runtimeMin, 0)} min autonomy`}
                />
                <Metric label="Mode" value={u.mode.toUpperCase()} tone={u.mode === "normal" ? "text-ok" : u.mode === "battery" ? "text-warn" : "text-major"} />
              </div>
              <div className="mt-2 space-y-1.5">
                <Bar pct={u.comm === "offline" ? 0 : u.loadPct} tone={u.loadPct > 88 ? "bg-warn" : "bg-flow"} />
                <Bar pct={u.comm === "offline" ? 0 : u.batteryPct} tone={u.batteryPct < 40 ? "bg-warn" : "bg-ok"} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <CommBadge comm={u.comm} />
                <span className={cn("num text-[10px]", SEV_TEXT[u.severity])}>
                  <StatusLamp severity={u.severity} className="mr-1" />
                  last comm {since(u.lastComm, s.now)} ago
                </span>
              </div>
            </Panel>
          </Link>
        ))}
        {units.length === 0 && (
          <Panel className="sm:col-span-2 xl:col-span-3">
            <p className="py-6 text-center text-sm text-muted-foreground">No units match this filter.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
