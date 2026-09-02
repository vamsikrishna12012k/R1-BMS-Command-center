import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useBms } from "@/lib/bms/hooks";
import { useTheme } from "@/lib/theme";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { CommBadge } from "@/components/bms/severity";
import { clockTime } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "System Settings — Meridian BMS" },
      { name: "description", content: "Platform appearance, gateway health and field protocol configuration for Modbus TCP and BACnet/IP integration." },
      { property: "og:title", content: "System Settings — Meridian BMS" },
      { property: "og:description", content: "Appearance, gateway status and field protocol configuration." },
    ],
  }),
  component: SettingsPage,
});

const DRIVERS = [
  { name: "Modbus TCP", detail: "UPS fleet · 502/tcp · poll 2 s", devices: 14, status: "online" as const },
  { name: "BACnet/IP", detail: "AHU & VAV controllers · 47808/udp", devices: 32, status: "online" as const },
  { name: "Modbus RTU over TCP", detail: "Energy meters · gateway GW-02", devices: 9, status: "degraded" as const },
  { name: "SNMP v3", detail: "Electrical panel relays · trap receiver", devices: 6, status: "online" as const },
];

function SettingsPage() {
  const s = useBms();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="Administration" title="System Settings" />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Gateway" value={s.gateway.toUpperCase()} tone={s.gateway === "online" ? "text-ok" : "text-warn"} />
        <Metric label="Link Latency" value={s.latencyMs} unit="ms" />
        <Metric label="Last Poll" value={clockTime(s.lastUpdate)} />
        <Metric label="Points Mapped" value={DRIVERS.reduce((n, d) => n + d.devices, 0)} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Appearance" subtitle="Applies to this browser only">
          <div className="grid grid-cols-2 gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-3 text-[13px] capitalize transition-colors",
                  theme === t ? "border-primary bg-primary/10 text-primary" : "border-line hover:bg-accent",
                )}
              >
                {t === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {t} appearance
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            The interface follows the Apple system typeface and adapts contrast for control-room and daylight viewing.
          </p>
        </Panel>

        <Panel title="Field Protocol Drivers" subtitle="Ready for hardware integration" bodyClassName="p-0">
          <div className="divide-y divide-line/60">
            {DRIVERS.map((d) => (
              <div key={d.name} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{d.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{d.detail}</div>
                </div>
                <span className="num ml-auto text-[12px] text-muted-foreground">{d.devices} devices</span>
                <CommBadge comm={d.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Alarm Thresholds" subtitle="Global defaults applied to new equipment">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["UPS load warning", "85 %"],
              ["UPS load critical", "95 %"],
              ["Battery autonomy minimum", "10 min"],
              ["Filter differential pressure", "300 Pa"],
              ["Supply air deviation", "±2.5 °C"],
              ["Comms timeout", "60 s"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-line bg-panel-2 px-3 py-2">
                <span className="text-[12px] text-muted-foreground">{label}</span>
                <span className="num text-[13px]">{value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Session" subtitle="Current supervisory client">
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label="Operator" value={s.user} />
            <Metric label="Role" value={s.role} />
            <Metric label="Connection" value={s.link.toUpperCase()} tone={s.link === "live" ? "text-ok" : "text-warn"} />
            <Metric label="Simulation Tick" value={s.tick} hint="2 s telemetry cadence" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
