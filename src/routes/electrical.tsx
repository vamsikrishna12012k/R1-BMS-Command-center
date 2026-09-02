import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { canControl } from "@/lib/bms/engine";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { CommBadge, SeverityBadge } from "@/components/bms/severity";
import { SingleLineDiagram } from "@/components/bms/diagrams/single-line";
import { TrendChart } from "@/components/bms/trend-chart";
import { ConfirmAction } from "@/components/bms/confirm-action";
import { nf } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/electrical")({
  head: () => ({
    meta: [
      { title: "Electrical Monitoring — Meridian BMS" },
      { name: "description", content: "Single-line electrical distribution: panel telemetry, breaker states and switching controls from utility to load." },
      { property: "og:title", content: "Electrical Monitoring — Meridian BMS" },
      { property: "og:description", content: "Live single-line diagram and electrical panel monitoring." },
    ],
  }),
  component: ElectricalPage,
});

function ElectricalPage() {
  const s = useBms();
  const engine = useBmsActions();
  const allowed = canControl(s.role, "critical");
  const [selected, setSelected] = useState<string>(s.panels[0]!.id);
  const p = s.panels.find((x) => x.id === selected) ?? s.panels[0]!;

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="Power" title="Electrical Monitoring" />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Panels Energized" value={`${s.panels.filter((x) => x.energized).length}/${s.panels.length}`} tone="text-flow" />
        <Metric label="Breakers Open" value={s.panels.filter((x) => !x.breakerClosed).length} tone="text-warn" />
        <Metric label="Distributed Load" value={nf(s.panels.filter((x) => x.kind === "load").reduce((n, x) => n + x.kw, 0), 0)} unit="kW" />
        <Metric label="Alarms" value={s.panels.filter((x) => x.severity !== "normal").length} />
      </div>

      <Panel title="Single Line Diagram" subtitle="Utility / generator to critical and mechanical loads" bodyClassName="p-0">
        <SingleLineDiagram panels={s.panels} selectedId={selected} onSelect={setSelected} className="rounded-none border-0 shadow-none" />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel
          title={p.name}
          subtitle={`${p.kind.toUpperCase()} · ${p.site.building}`}
          right={
            <>
              <CommBadge comm={p.comm} />
              <SeverityBadge severity={p.severity} />
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Voltage" value={nf(p.voltage, 0)} unit="V" />
            <Metric label="Current" value={nf(p.current, 0)} unit="A" />
            <Metric label="Active Power" value={nf(p.kw, 1)} unit="kW" tone="text-flow" />
            <Metric label="Frequency" value={nf(p.frequency, 2)} unit="Hz" />
            <Metric label="Power Factor" value={nf(p.powerFactor, 3)} />
            <Metric label="Breaker" value={p.breakerClosed ? "CLOSED" : "OPEN"} tone={p.breakerClosed ? "text-ok" : "text-warn"} />
          </div>
          <ConfirmAction
            title={`${p.breakerClosed ? "Open" : "Close"} breaker · ${p.name}`}
            description={`Switching this breaker ${p.breakerClosed ? "de-energizes" : "energizes"} everything downstream. This is a critical operation and is fully audited.`}
            confirmLabel={p.breakerClosed ? "Open breaker" : "Close breaker"}
            onConfirm={() => (allowed ? engine.setBreaker(p.id, !p.breakerClosed) : engine.denied(p.name, "Breaker operation"))}
          >
            <button
              className={cn(
                "mt-3 w-full rounded-full border px-3 py-2 text-[13px] font-medium transition-colors",
                p.breakerClosed ? "border-crit text-crit hover:bg-crit/10" : "border-primary bg-primary text-primary-foreground",
                !allowed && "opacity-50",
              )}
            >
              {p.breakerClosed ? "Open Breaker" : "Close Breaker"}
            </button>
          </ConfirmAction>
        </Panel>

        <Panel title="Panel Trends" subtitle={`${p.name} load profile`} className="xl:col-span-2">
          <TrendChart
            deviceId={p.id}
            now={s.now}
            series={[
              { key: "kw", label: "Active Power", color: "var(--chart-1)", current: p.kw, amplitude: 25, min: 0, type: "area", unit: "kW" },
              { key: "current", label: "Current", color: "var(--chart-4)", current: p.current, amplitude: 40, min: 0, unit: "A" },
              { key: "voltage", label: "Voltage", color: "var(--chart-2)", current: p.voltage, amplitude: 4, unit: "V" },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
