import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { canControl } from "@/lib/bms/engine";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric, Bar } from "@/components/bms/panel";
import { CommBadge, SeverityBadge } from "@/components/bms/severity";
import { AhuDiagram } from "@/components/bms/diagrams/ahu-diagram";
import { DuctView } from "@/components/bms/diagrams/duct-view";
import { TrendChart } from "@/components/bms/trend-chart";
import { ConfirmAction } from "@/components/bms/confirm-action";
import { nf } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hvac/ahu/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — AHU Detail · Meridian BMS` },
      { name: "description", content: `Live air handling telemetry, duct network and control setpoints for ${params.id}.` },
      { property: "og:title", content: `${params.id} — AHU Detail · Meridian BMS` },
      { property: "og:description", content: "AHU sectional mimic, duct network and supply air controls." },
    ],
  }),
  component: AhuDetail,
  notFoundComponent: () => <p className="p-6 text-sm text-muted-foreground">AHU not found.</p>,
});

function AhuDetail() {
  const { id } = Route.useParams();
  const s = useBms();
  const engine = useBmsActions();
  const a = s.ahus.find((x) => x.id === id);
  if (!a) throw notFound();

  const vavs = s.vavs.filter((v) => v.ahuId === a.id);
  const allowed = canControl(s.role, "basic");

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow={
          <>
            <Link to="/hvac/ahu" className="hover:text-foreground">
              Air Handling Units
            </Link>{" "}
            / {a.site.building} · {a.site.floor}
          </>
        }
        title={a.name}
        right={
          <>
            <CommBadge comm={a.comm} />
            <SeverityBadge severity={a.severity} />
          </>
        }
      />

      <Panel title="Unit Mimic" subtitle={a.running ? "Running" : "Stopped"} bodyClassName="p-0">
        <AhuDiagram ahu={a} className="rounded-none border-0 shadow-none" />
      </Panel>

      <div className="grid gap-3 lg:grid-cols-4">
        <Metric label="Supply Air" value={nf(a.supplyTempC, 1)} unit="°C" tone="text-cold" hint={`Setpoint ${nf(a.setpointC, 1)}°C`} />
        <Metric label="Return Air" value={nf(a.returnTempC, 1)} unit="°C" />
        <Metric label="Static Pressure" value={nf(a.supplyPressurePa, 0)} unit="Pa" />
        <Metric label="Fan Power" value={nf(a.powerKw, 2)} unit="kW" />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Trends" subtitle="Temperature and airflow" className="xl:col-span-2">
          <TrendChart
            deviceId={a.id}
            now={s.now}
            series={[
              { key: "supply", label: "Supply Temp", color: "var(--chart-1)", current: a.supplyTempC, amplitude: 1.4, type: "area", unit: "°C" },
              { key: "return", label: "Return Temp", color: "var(--chart-3)", current: a.returnTempC, amplitude: 1.6, unit: "°C" },
              { key: "flow", label: "Airflow", color: "var(--chart-2)", current: a.airflowCmh, amplitude: 900, min: 0, unit: "m³/h" },
            ]}
            thresholds={[{ value: a.setpointC, label: "Setpoint", color: "var(--sev-info)" }]}
          />
        </Panel>

        <Panel title="Controls" subtitle={allowed ? `Authorized as ${s.role}` : "Read-only role"}>
          <div className="space-y-3">
            <div>
              <div className="label-xs mb-1">Supply air setpoint · {nf(a.setpointC, 1)} °C</div>
              <input
                type="range"
                min={12}
                max={24}
                step={0.5}
                value={a.setpointC}
                disabled={!allowed}
                onChange={(e) => engine.setAhuSetpoint(a.id, Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </div>
            <div>
              <div className="label-xs mb-1">Fresh air damper · {nf(a.damperPct, 0)} %</div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={a.damperPct}
                disabled={!allowed}
                onChange={(e) => engine.setAhuDamper(a.id, Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </div>
            <div>
              <div className="label-xs mb-1">Cooling valve · {nf(a.valvePct, 0)} %</div>
              <Bar pct={a.valvePct} tone="bg-cold" />
            </div>
            <ConfirmAction
              title={`${a.running ? "Stop" : "Start"} ${a.name}`}
              description={`This commands the unit to ${a.running ? "stop" : "start"} and affects conditioned zones served by it.`}
              confirmLabel={a.running ? "Stop unit" : "Start unit"}
              onConfirm={() => (allowed ? engine.setAhuRunning(a.id, !a.running) : engine.denied(a.name, "AHU start/stop"))}
            >
              <button
                className={cn(
                  "w-full rounded-full border px-3 py-2 text-[13px] font-medium transition-colors",
                  a.running ? "border-crit text-crit hover:bg-crit/10" : "border-primary bg-primary text-primary-foreground",
                  !allowed && "opacity-50",
                )}
              >
                {a.running ? "Stop Unit" : "Start Unit"}
              </button>
            </ConfirmAction>
          </div>
        </Panel>
      </div>

      <Panel title="Duct Network" subtitle={`${vavs.length} downstream VAV terminals`} bodyClassName="p-0">
        <DuctView ahu={a} vavs={vavs} className="rounded-none border-0 shadow-none" />
      </Panel>
    </div>
  );
}
