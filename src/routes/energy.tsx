import { createFileRoute } from "@tanstack/react-router";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric, Bar } from "@/components/bms/panel";
import { CommBadge, SeverityBadge } from "@/components/bms/severity";
import { TrendChart } from "@/components/bms/trend-chart";
import { int, nf } from "@/lib/bms/format";

export const Route = createFileRoute("/energy")({
  head: () => ({
    meta: [
      { title: "Energy Management — Meridian BMS" },
      { name: "description", content: "Campus energy metering: real-time demand, consumption, power factor, max demand and per-meter breakdown." },
      { property: "og:title", content: "Energy Management — Meridian BMS" },
      { property: "og:description", content: "Track building energy demand, consumption and power quality in real time." },
    ],
  }),
  component: EnergyPage,
});

function EnergyPage() {
  const s = useBms();
  const main = s.meters[0]!;
  const subs = s.meters.slice(1);
  const totalSub = subs.reduce((n, m) => n + m.kw, 0);

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="Power" title="Energy Management" />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Metric label="Active Demand" value={nf(main.kw, 0)} unit="kW" tone="text-flow" />
        <Metric label="Apparent" value={nf(main.kva, 0)} unit="kVA" />
        <Metric label="Reactive" value={nf(main.kvar, 0)} unit="kVAr" />
        <Metric label="Power Factor" value={nf(main.powerFactor, 3)} tone={main.powerFactor < 0.9 ? "text-warn" : "text-ok"} />
        <Metric label="Consumption" value={int(main.kwh)} unit="kWh" hint={`Peak ${nf(main.peakLoadKw, 0)} kW`} />
      </div>

      <Panel title="Main Incomer Trend" subtitle={main.name}>
        <TrendChart
          deviceId={main.id}
          now={s.now}
          height={260}
          series={[
            { key: "kw", label: "Active Power", color: "var(--chart-1)", current: main.kw, amplitude: 70, min: 0, type: "area", unit: "kW" },
            { key: "kvar", label: "Reactive", color: "var(--chart-3)", current: main.kvar, amplitude: 30, min: 0, unit: "kVAr" },
            { key: "pf", label: "Power Factor", color: "var(--chart-2)", current: main.powerFactor * 100, amplitude: 3, min: 60, max: 100, unit: "%" },
          ]}
          thresholds={[{ value: main.maxDemandKw, label: "Contract max demand", color: "var(--sev-warn)" }]}
        />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Load Distribution" subtitle="Share of measured sub-metering" className="xl:col-span-1">
          <div className="space-y-2.5">
            {subs.map((m) => (
              <div key={m.id}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="truncate">{m.name}</span>
                  <span className="num text-muted-foreground">{nf(m.kw, 1)} kW</span>
                </div>
                <Bar pct={(m.kw / Math.max(totalSub, 1)) * 100} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Meter Registers" subtitle={`${s.meters.length} metering points`} className="xl:col-span-2" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-panel-2">
                <tr className="label-xs">
                  <th className="px-3 py-2">Meter</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">V</th>
                  <th className="px-3 py-2">A</th>
                  <th className="px-3 py-2">kW</th>
                  <th className="px-3 py-2">PF</th>
                  <th className="px-3 py-2">kWh</th>
                  <th className="px-3 py-2">Comm</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {s.meters.map((m) => (
                  <tr key={m.id} className="border-t border-line/60">
                    <td className="num px-3 py-2">{m.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.site.building}</td>
                    <td className="num px-3 py-2">{nf(m.voltage, 0)}</td>
                    <td className="num px-3 py-2">{nf(m.current, 0)}</td>
                    <td className="num px-3 py-2">{nf(m.kw, 1)}</td>
                    <td className="num px-3 py-2">{nf(m.powerFactor, 3)}</td>
                    <td className="num px-3 py-2">{int(m.kwh)}</td>
                    <td className="px-3 py-2">
                      <CommBadge comm={m.comm} />
                    </td>
                    <td className="px-3 py-2">
                      <SeverityBadge severity={m.severity} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
