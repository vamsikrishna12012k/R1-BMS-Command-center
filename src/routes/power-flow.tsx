import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { SeverityBadge } from "@/components/bms/severity";
import { SingleLineDiagram } from "@/components/bms/diagrams/single-line";
import { UpsPowerFlow } from "@/components/bms/diagrams/ups-flow";
import { nf } from "@/lib/bms/format";

export const Route = createFileRoute("/power-flow")({
  head: () => ({
    meta: [
      { title: "Power Flow — R1 BMS Command Center" },
      { name: "description", content: "Animated campus power flow from utility and generator through UPS systems to critical and mechanical loads." },
      { property: "og:title", content: "Power Flow — R1 BMS Command Center" },
      { property: "og:description", content: "Animated end-to-end power distribution visualization." },
    ],
  }),
  component: PowerFlowPage,
});

function PowerFlowPage() {
  const s = useBms();
  const [upsId, setUpsId] = useState(s.ups[0]!.id);
  const ups = s.ups.find((u) => u.id === upsId) ?? s.ups[0]!;
  const main = s.meters[0]!;

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="Power" title="Campus Power Flow" />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Incoming Supply" value={nf(main.kw, 0)} unit="kW" tone="text-flow" />
        <Metric label="UPS Protected Load" value={nf(s.ups.reduce((n, u) => n + u.outputPowerKw, 0), 0)} unit="kW" />
        <Metric label="Mechanical Load" value={nf(s.ahus.reduce((n, a) => n + a.powerKw, 0) + s.cassettes.reduce((n, c) => n + c.powerKw, 0), 0)} unit="kW" tone="text-cold" />
        <Metric label="Generator" value={s.panels.find((p) => p.kind === "generator")?.breakerClosed ? "ON LOAD" : "STANDBY"} />
      </div>

      <Panel title="Distribution Network" subtitle="Live energized paths" bodyClassName="p-0">
        <SingleLineDiagram panels={s.panels} className="rounded-none border-0 shadow-none" />
      </Panel>

      <Panel
        title="UPS Internal Flow"
        subtitle={`${ups.site.building} · ${ups.site.room}`}
        right={
          <>
            <SeverityBadge severity={ups.severity} />
            <select
              value={upsId}
              onChange={(e) => setUpsId(e.target.value)}
              className="rounded-full border border-line bg-panel px-3 py-1 text-[12px]"
              aria-label="Select UPS"
            >
              {s.ups.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </>
        }
        bodyClassName="p-0"
      >
        <UpsPowerFlow ups={ups} className="rounded-none border-0 shadow-none" />
      </Panel>
    </div>
  );
}
