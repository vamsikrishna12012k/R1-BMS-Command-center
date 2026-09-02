import { createFileRoute, Link } from "@tanstack/react-router";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric, Bar } from "@/components/bms/panel";
import { CommBadge, SeverityBadge } from "@/components/bms/severity";
import { AhuDiagram } from "@/components/bms/diagrams/ahu-diagram";
import { nf } from "@/lib/bms/format";

export const Route = createFileRoute("/hvac/ahu/")({
  head: () => ({
    meta: [
      { title: "Air Handling Units — Meridian BMS" },
      { name: "description", content: "Live AHU status: supply and return temperature, airflow, filter condition, damper and valve positions." },
      { property: "og:title", content: "Air Handling Units — Meridian BMS" },
      { property: "og:description", content: "Monitor and control every air handling unit across the campus." },
    ],
  }),
  component: AhuList,
});

function AhuList() {
  const s = useBms();
  const running = s.ahus.filter((a) => a.running).length;
  const totalFlow = s.ahus.reduce((n, a) => n + a.airflowCmh, 0);
  const totalKw = s.ahus.reduce((n, a) => n + a.powerKw, 0);
  const dirty = s.ahus.filter((a) => a.filterPct > 80).length;

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="HVAC" title="Air Handling Units" />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Units Running" value={`${running}/${s.ahus.length}`} tone="text-flow" />
        <Metric label="Total Airflow" value={nf(totalFlow, 0)} unit="m³/h" />
        <Metric label="Fan Power" value={nf(totalKw, 1)} unit="kW" />
        <Metric label="Filters Due" value={dirty} tone={dirty ? "text-warn" : "text-ok"} hint="Above 80% loading" />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {s.ahus.map((a) => (
          <Panel
            key={a.id}
            title={a.name}
            subtitle={`${a.site.building} · ${a.site.floor} · ${a.site.zone}`}
            right={
              <>
                <CommBadge comm={a.comm} />
                <SeverityBadge severity={a.severity} />
                <Link to="/hvac/ahu/$id" params={{ id: a.id }} className="rounded-full border border-line px-2.5 py-1 text-[11px] hover:bg-accent">
                  Detail
                </Link>
              </>
            }
            bodyClassName="p-0"
          >
            <AhuDiagram ahu={a} className="rounded-none border-0 shadow-none" />
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
              <Metric label="Supply Air" value={nf(a.supplyTempC, 1)} unit="°C" tone="text-cold" hint={`SP ${nf(a.setpointC, 1)}°C`} />
              <Metric label="Return Air" value={nf(a.returnTempC, 1)} unit="°C" />
              <Metric label="Airflow" value={nf(a.airflowCmh, 0)} unit="m³/h" />
              <Metric label="Fan Speed" value={nf(a.fanSpeedPct, 0)} unit="%" />
            </div>
            <div className="px-3 pb-3">
              <div className="label-xs mb-1">Filter loading {nf(a.filterPct, 0)}% · ΔP {nf(a.filterDp, 0)} Pa</div>
              <Bar pct={a.filterPct} tone={a.filterPct > 80 ? "bg-warn" : "bg-ok"} />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
