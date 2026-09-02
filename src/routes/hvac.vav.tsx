import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { canControl } from "@/lib/bms/engine";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric, Bar } from "@/components/bms/panel";
import { CommBadge, SeverityBadge } from "@/components/bms/severity";
import { DuctView } from "@/components/bms/diagrams/duct-view";
import { nf } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hvac/vav")({
  head: () => ({
    meta: [
      { title: "VAV Terminals & Duct View — R1 BMS Command Center" },
      { name: "description", content: "Interactive duct layout with live VAV damper positions, zone airflow and temperature control." },
      { property: "og:title", content: "VAV Terminals & Duct View — R1 BMS Command Center" },
      { property: "og:description", content: "Interactive duct network and variable air volume terminal control." },
    ],
  }),
  component: VavPage,
});

function VavPage() {
  const s = useBms();
  const engine = useBmsActions();
  const allowed = canControl(s.role, "basic");
  const [ahuId, setAhuId] = useState(s.ahus[0]!.id);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const ahu = s.ahus.find((a) => a.id === ahuId) ?? s.ahus[0]!;
  const vavs = s.vavs.filter((v) => v.ahuId === ahu.id);
  const sel = vavs.find((v) => v.id === selected);

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="HVAC"
        title="VAV Terminals & Duct View"
        right={
          <select
            value={ahuId}
            onChange={(e) => {
              setAhuId(e.target.value);
              setSelected(undefined);
            }}
            className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12px]"
            aria-label="Select air handling unit"
          >
            {s.ahus.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.site.building} {a.site.floor}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Terminals" value={vavs.length} hint={`Served by ${ahu.name}`} />
        <Metric label="Zone Airflow" value={nf(vavs.reduce((n, v) => n + v.airflowCmh, 0), 0)} unit="m³/h" tone="text-flow" />
        <Metric label="Avg Damper" value={nf(vavs.reduce((n, v) => n + v.damperPct, 0) / Math.max(vavs.length, 1), 0)} unit="%" />
        <Metric label="Zones Off Setpoint" value={vavs.filter((v) => Math.abs(v.tempC - v.setpointC) > 1.5).length} tone="text-warn" />
      </div>

      <Panel title="Duct Network" subtitle="Click a terminal to inspect" bodyClassName="p-0">
        <DuctView ahu={ahu} vavs={vavs} selectedId={selected} onSelect={setSelected} className="rounded-none border-0 shadow-none" />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Terminal List" subtitle={`${vavs.length} VAV boxes`} className="xl:col-span-2" bodyClassName="p-0">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-panel-2">
                <tr className="label-xs">
                  <th className="px-3 py-2">Terminal</th>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Temp</th>
                  <th className="px-3 py-2">Setpoint</th>
                  <th className="px-3 py-2">Damper</th>
                  <th className="px-3 py-2">Airflow</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {vavs.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelected(v.id)}
                    className={cn("cursor-pointer border-t border-line/60 hover:bg-accent", selected === v.id && "bg-accent")}
                  >
                    <td className="num px-3 py-2">{v.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{v.site.zone}</td>
                    <td className="num px-3 py-2">{nf(v.tempC, 1)}°C</td>
                    <td className="num px-3 py-2 text-muted-foreground">{nf(v.setpointC, 1)}°C</td>
                    <td className="num px-3 py-2">{nf(v.damperPct, 0)}%</td>
                    <td className="num px-3 py-2">{nf(v.airflowCmh, 0)}</td>
                    <td className="px-3 py-2">
                      <SeverityBadge severity={v.severity} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={sel ? sel.name : "Terminal Detail"} subtitle={sel ? `${sel.site.building} · ${sel.site.zone}` : "Select a terminal"}>
          {sel ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CommBadge comm={sel.comm} />
                <SeverityBadge severity={sel.severity} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Zone Temp" value={nf(sel.tempC, 1)} unit="°C" tone="text-cold" />
                <Metric label="Setpoint" value={nf(sel.setpointC, 1)} unit="°C" />
                <Metric label="Airflow" value={nf(sel.airflowCmh, 0)} unit="m³/h" />
                <Metric label="Damper" value={nf(sel.damperPct, 0)} unit="%" />
              </div>
              <Bar pct={sel.damperPct} />
              <div>
                <div className="label-xs mb-1">Damper command</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={sel.damperPct}
                  disabled={!allowed}
                  onChange={(e) => engine.setVavDamper(sel.id, Number(e.target.value))}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Pick a terminal from the duct view or list.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
