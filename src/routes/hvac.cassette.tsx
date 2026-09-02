import { createFileRoute } from "@tanstack/react-router";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { canControl } from "@/lib/bms/engine";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { CommBadge, SeverityBadge } from "@/components/bms/severity";
import { CassetteDiagram } from "@/components/bms/diagrams/cassette-diagram";
import { nf } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hvac/cassette")({
  head: () => ({
    meta: [
      { title: "Cassette AC Units — R1 BMS Command Center" },
      { name: "description", content: "Room-level cassette air conditioning: on/off state, room temperature, setpoint, mode and fan speed." },
      { property: "og:title", content: "Cassette AC Units — R1 BMS Command Center" },
      { property: "og:description", content: "Control cassette AC units room by room across the campus." },
    ],
  }),
  component: CassettePage,
});

const MODES = ["cool", "fan", "auto", "dry"] as const;
const SPEEDS = ["low", "medium", "high", "auto"] as const;

function CassettePage() {
  const s = useBms();
  const engine = useBmsActions();
  const allowed = canControl(s.role, "basic");
  const on = s.cassettes.filter((c) => c.on).length;
  const kw = s.cassettes.reduce((n, c) => n + c.powerKw, 0);

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="HVAC" title="Cassette AC Units" />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Units On" value={`${on}/${s.cassettes.length}`} tone="text-flow" />
        <Metric label="Total Power" value={nf(kw, 1)} unit="kW" />
        <Metric label="Avg Room Temp" value={nf(s.cassettes.reduce((n, c) => n + c.roomTempC, 0) / s.cassettes.length, 1)} unit="°C" />
        <Metric label="Offline" value={s.cassettes.filter((c) => c.comm === "offline").length} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {s.cassettes.map((c) => (
          <Panel
            key={c.id}
            title={c.name}
            subtitle={`${c.site.building} · ${c.site.room}`}
            right={
              <>
                <CommBadge comm={c.comm} />
                <SeverityBadge severity={c.severity} />
              </>
            }
            bodyClassName="p-0"
          >
            <CassetteDiagram unit={c} className="rounded-none border-0 shadow-none" />
            <div className="grid grid-cols-2 gap-2 p-3">
              <Metric label="Room Temp" value={nf(c.roomTempC, 1)} unit="°C" tone="text-cold" />
              <Metric label="Setpoint" value={nf(c.setpointC, 1)} unit="°C" />
            </div>
            <div className="space-y-2 px-3 pb-3">
              <div>
                <div className="label-xs mb-1">Setpoint</div>
                <input
                  type="range"
                  min={18}
                  max={28}
                  step={0.5}
                  value={c.setpointC}
                  disabled={!allowed}
                  onChange={(e) => engine.setCassette(c.id, { setpointC: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {MODES.map((m) => (
                  <button
                    key={m}
                    disabled={!allowed}
                    onClick={() => engine.setCassette(c.id, { mode: m })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] capitalize",
                      c.mode === m ? "border-primary bg-primary text-primary-foreground" : "border-line hover:bg-accent",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {SPEEDS.map((f) => (
                  <button
                    key={f}
                    disabled={!allowed}
                    onClick={() => engine.setCassette(c.id, { fanSpeed: f })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] capitalize",
                      c.fanSpeed === f ? "border-foreground bg-secondary" : "border-line hover:bg-accent",
                    )}
                  >
                    {f}
                  </button>
                ))}
                <button
                  disabled={!allowed}
                  onClick={() => engine.setCassette(c.id, { on: !c.on })}
                  className={cn(
                    "ml-auto rounded-full border px-3 py-1 text-[11px] font-medium",
                    c.on ? "border-crit text-crit hover:bg-crit/10" : "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {c.on ? "Turn Off" : "Turn On"}
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
