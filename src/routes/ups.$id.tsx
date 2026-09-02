import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { canControl } from "@/lib/bms/engine";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric, Bar } from "@/components/bms/panel";
import { CommBadge, SeverityBadge } from "@/components/bms/severity";
import { UpsPowerFlow } from "@/components/bms/diagrams/ups-flow";
import { TrendChart } from "@/components/bms/trend-chart";
import { ConfirmAction } from "@/components/bms/confirm-action";
import { nf, stamp } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ups/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — UPS Detail · Meridian BMS` },
      { name: "description", content: `Detailed live telemetry, power flow, battery status and controls for UPS ${params.id}.` },
      { property: "og:title", content: `${params.id} — UPS Detail · Meridian BMS` },
      { property: "og:description", content: "Live UPS telemetry, single-line power flow and operating controls." },
    ],
  }),
  component: UpsDetail,
  notFoundComponent: () => <p className="p-6 text-sm text-muted-foreground">UPS unit not found.</p>,
});

function UpsDetail() {
  const { id } = Route.useParams();
  const s = useBms();
  const engine = useBmsActions();
  const u = s.ups.find((x) => x.id === id);
  if (!u) throw notFound();

  const allowed = canControl(s.role, "critical");

  const faults = Object.entries(u.faults) as [string, boolean][];

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow={
          <>
            <Link to="/ups" className="hover:text-foreground">
              UPS Systems
            </Link>{" "}
            / {u.site.building} · {u.site.room}
          </>
        }
        title={u.name}
        right={
          <>
            <CommBadge comm={u.comm} />
            <SeverityBadge severity={u.severity} />
          </>
        }
      />

      <Panel title="Power Flow" subtitle={`${u.capacityKva} kVA · ${u.mode.toUpperCase()} mode`} bodyClassName="p-0">
        <UpsPowerFlow ups={u} className="rounded-none border-0 shadow-none" />
      </Panel>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Input" subtitle="Utility supply">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Voltage" value={nf(u.inputVoltage, 1)} unit="V" />
            <Metric label="Current" value={nf(u.inputCurrent, 1)} unit="A" />
            <Metric label="Frequency" value={nf(u.inputFrequency, 2)} unit="Hz" />
            <Metric label="Power Factor" value={nf(u.powerFactor, 3)} />
          </div>
        </Panel>
        <Panel title="Output" subtitle="Protected load">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Voltage" value={nf(u.outputVoltage, 1)} unit="V" />
            <Metric label="Current" value={nf(u.outputCurrent, 1)} unit="A" />
            <Metric label="Active Power" value={nf(u.outputPowerKw, 2)} unit="kW" tone="text-flow" />
            <Metric label="Load" value={nf(u.loadPct, 1)} unit="%" tone={u.loadPct > 88 ? "text-warn" : undefined} />
          </div>
          <div className="mt-2">
            <Bar pct={u.loadPct} tone={u.loadPct > 88 ? "bg-warn" : "bg-flow"} />
          </div>
        </Panel>
        <Panel title="Battery" subtitle={u.charging ? "Charging" : "Discharging / float"}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Charge" value={nf(u.batteryPct, 0)} unit="%" tone={u.batteryPct < 40 ? "text-warn" : "text-ok"} />
            <Metric label="Autonomy" value={nf(u.runtimeMin, 0)} unit="min" />
            <Metric label="Voltage" value={nf(u.batteryVoltage, 1)} unit="V" />
            <Metric label="Current" value={nf(u.batteryCurrent, 1)} unit="A" />
            <Metric label="Temperature" value={nf(u.batteryTempC, 1)} unit="°C" tone={u.batteryTempC > 32 ? "text-warn" : undefined} />
            <Metric label="Health" value={nf(u.batteryHealthPct, 0)} unit="%" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Telemetry Trends" subtitle="Load, battery and output" className="xl:col-span-2">
          <TrendChart
            deviceId={u.id}
            now={s.now}
            series={[
              { key: "load", label: "Load", color: "var(--chart-1)", current: u.loadPct, amplitude: 12, min: 0, max: 100, type: "area", unit: "%" },
              { key: "battery", label: "Battery", color: "var(--chart-2)", current: u.batteryPct, amplitude: 8, min: 0, max: 100, unit: "%" },
              { key: "kw", label: "Output", color: "var(--chart-4)", current: u.outputPowerKw, amplitude: 10, min: 0, unit: "kW" },
            ]}
            thresholds={[{ value: 90, label: "Overload", color: "var(--sev-warn)" }]}
          />
        </Panel>

        <div className="space-y-3">
          <Panel title="Fault Status" subtitle="Module diagnostics">
            <div className="grid grid-cols-2 gap-2">
              {faults.map(([key, active]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-line bg-panel-2 px-2.5 py-2">
                  <span className="text-[12px] capitalize">{key}</span>
                  <SeverityBadge severity={active ? "critical" : "normal"} label={active ? "FAULT" : "OK"} />
                </div>
              ))}
            </div>
            <p className="num mt-2 text-[10px] text-muted-foreground">Last poll {stamp(u.lastComm)}</p>
          </Panel>

          <Panel title="Controls" subtitle={allowed ? `Authorized as ${s.role}` : `${s.role} has read-only access`}>
            <div className="flex flex-wrap gap-2">
              {(["normal", "battery", "bypass"] as const).map((m) => (
                <ConfirmAction
                  key={m}
                  title={`Transfer ${u.name} to ${m.toUpperCase()}`}
                  description={
                    m === "bypass"
                      ? "Bypass removes UPS protection from the connected load. Confirm this switching operation."
                      : `This will command ${u.name} into ${m} operating mode. The action is written to the audit log.`
                  }
                  confirmLabel="Execute"
                  onConfirm={() => (allowed ? engine.setUpsMode(u.id, m) : engine.denied(u.name, `UPS mode change to ${m}`))}
                >
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                      u.mode === m ? "border-primary bg-primary text-primary-foreground" : "border-line hover:bg-accent",
                      !allowed && "opacity-50",
                    )}
                  >
                    {m === "normal" ? "Normal" : m === "battery" ? "Battery Test" : "Manual Bypass"}
                  </button>
                </ConfirmAction>
              ))}
            </div>
            {!allowed && (
              <p className="mt-2 text-[11px] text-warn">
                Your role cannot issue critical switching commands — attempts are recorded as denied in the audit trail.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
