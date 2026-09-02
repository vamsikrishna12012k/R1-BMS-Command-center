import { createFileRoute, Link } from "@tanstack/react-router";
import { useBms } from "@/lib/bms/hooks";
import { Panel, Metric, Bar } from "@/components/bms/panel";
import { PageHeader } from "@/components/bms/app-shell";
import { SEV_TEXT, SeverityBadge, StatusLamp } from "@/components/bms/severity";
import { TrendChart } from "@/components/bms/trend-chart";
import { UpsPowerFlow } from "@/components/bms/diagrams/ups-flow";
import { AhuDiagram } from "@/components/bms/diagrams/ahu-diagram";
import { clockTime, int, nf, since } from "@/lib/bms/format";
import type { Severity } from "@/lib/bms/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "R1 BMS Command Center" },
      {
        name: "description",
        content:
          "Live command center for UPS fleet health, HVAC status, building load, energy use and active alarms in real time.",
      },
      { property: "og:title", content: "R1 BMS Command Center" },
      {
        property: "og:description",
        content: "Real-time building operations overview: UPS, AHU, VAV, energy and electrical systems.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="panel-surface px-3 py-2.5">
      <div className="label-xs truncate">{label}</div>
      <div className={`num mt-1 text-2xl leading-none ${tone ?? "text-foreground"}`}>{value}</div>
      {sub && <div className="num mt-1 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const s = useBms();

  const upsOnline = s.ups.filter((u) => u.comm === "online").length;
  const upsAlarm = s.ups.filter((u) => u.severity === "critical" || u.severity === "major" || u.severity === "warning").length;
  const upsOffline = s.ups.filter((u) => u.comm === "offline").length;
  const ahusRunning = s.ahus.filter((a) => a.running && a.comm !== "offline").length;
  const vavActive = s.vavs.filter((v) => v.damperPct > 0 && v.comm !== "offline").length;
  const vavClosed = s.vavs.length - vavActive;
  const mainMeter = s.meters[0]!;
  const openAlarms = s.alarms.filter((a) => a.clearedAt === null);
  const critical = openAlarms.filter((a) => a.severity === "critical").length;
  const warnings = openAlarms.filter((a) => a.severity === "warning").length;
  const offlineDevices =
    upsOffline +
    s.ahus.filter((a) => a.comm === "offline").length +
    s.cassettes.filter((c) => c.comm === "offline").length +
    s.vavs.filter((v) => v.comm === "offline").length;

  const worst = (list: { severity: Severity }[]): Severity => {
    if (list.some((x) => x.severity === "critical")) return "critical";
    if (list.some((x) => x.severity === "offline")) return "offline";
    if (list.some((x) => x.severity === "major")) return "major";
    if (list.some((x) => x.severity === "warning")) return "warning";
    return "normal";
  };

  const health: { label: string; severity: Severity; note: string }[] = [
    { label: "Electrical Systems", severity: worst(s.panels), note: `${s.panels.filter((p) => p.energized).length}/${s.panels.length} energized` },
    { label: "UPS Systems", severity: worst(s.ups), note: `${upsOnline}/${s.ups.length} online` },
    { label: "HVAC Systems", severity: worst([...s.ahus, ...s.vavs, ...s.cassettes]), note: `${ahusRunning}/${s.ahus.length} AHUs running` },
    { label: "Energy Monitoring", severity: worst(s.meters), note: `${s.meters.length} meters polled` },
    { label: "Network Communication", severity: offlineDevices > 0 ? "warning" : "normal", note: `${offlineDevices} devices offline` },
  ];

  const heroUps = [...s.ups].sort((a, b) => b.loadPct - a.loadPct)[0]!;
  const heroAhu = s.ahus.find((a) => a.running) ?? s.ahus[0]!;
  const hvacKw = s.ahus.reduce((n, a) => n + a.powerKw, 0) + s.cassettes.reduce((n, c) => n + c.powerKw, 0);
  const upsKw = s.ups.reduce((n, u) => n + u.outputPowerKw, 0);

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow={`${s.ups[0]!.site.campus} · Tower A + Tower B`}
        title="Command Center"
        right={
          <div className="num flex items-center gap-2 text-[11px] text-muted-foreground">
            <StatusLamp severity="normal" /> SIMULATION MODE · last update {clockTime(s.lastUpdate)}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Building Load" value={`${nf(mainMeter.kw, 0)}`} sub="kW active demand" tone="text-flow" />
        <Kpi label="Total Energy" value={`${int(mainMeter.kwh / 1000)}`} sub="MWh cumulative" />
        <Kpi label="UPS Online" value={`${upsOnline}/${s.ups.length}`} sub={`${upsAlarm} in alarm · ${upsOffline} offline`} tone="text-ok" />
        <Kpi label="AHUs Running" value={`${ahusRunning}/${s.ahus.length}`} sub={`${s.cassettes.filter((c) => c.on).length}/${s.cassettes.length} cassette units on`} />
        <Kpi label="VAV Active" value={`${vavActive}/${s.vavs.length}`} sub={`${vavClosed} closed`} />
        <Kpi label="Critical Alarms" value={`${critical}`} sub={`${warnings} warnings · ${offlineDevices} offline`} tone={critical ? "text-crit" : "text-ok"} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Building Health" subtitle="Subsystem supervisory status" className="xl:col-span-1">
          <div className="divide-y divide-line/60">
            {health.map((h) => (
              <div key={h.label} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusLamp severity={h.severity} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">{h.label}</div>
                    <div className="num truncate text-[10px] text-muted-foreground">{h.note}</div>
                  </div>
                </div>
                <SeverityBadge severity={h.severity} />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="UPS Output" value={nf(upsKw, 0)} unit="kW" tone="text-flow" />
            <Metric label="HVAC Load" value={nf(hvacKw, 0)} unit="kW" tone="text-cold" />
            <Metric label="Power Factor" value={nf(mainMeter.powerFactor, 3)} />
            <Metric label="Data Latency" value={s.latencyMs} unit="ms" />
          </div>
        </Panel>

        <Panel
          title="Building Load Trend"
          subtitle="Main incomer · active power"
          className="xl:col-span-2"
        >
          <TrendChart
            deviceId="EM-MAIN"
            now={s.now}
            defaultRange="24h"
            height={228}
            series={[
              { key: "kw", label: "Active Power", color: "var(--chart-1)", current: mainMeter.kw, amplitude: 60, min: 0, type: "area", unit: "kW" },
              { key: "kva", label: "Apparent Power", color: "var(--chart-4)", current: mainMeter.kva, amplitude: 60, min: 0, unit: "kVA" },
            ]}
            thresholds={[{ value: mainMeter.maxDemandKw, label: "Max demand", color: "var(--sev-warn)" }]}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title={`${heroUps.name} · Power Flow`}
          subtitle={`${heroUps.site.building} · ${heroUps.site.room}`}
          right={
            <>
              <SeverityBadge severity={heroUps.severity} />
              <Link to="/ups/$id" params={{ id: heroUps.id }} className="num rounded-sm border border-line px-1.5 py-0.5 text-[10px] hover:text-flow">
                DRILL DOWN
              </Link>
            </>
          }
          bodyClassName="p-0"
        >
          <UpsPowerFlow ups={heroUps} className="rounded-none border-0" />
        </Panel>

        <Panel
          title={`${heroAhu.name} · Air Handling`}
          subtitle={`${heroAhu.site.building} · ${heroAhu.site.floor}`}
          right={
            <>
              <SeverityBadge severity={heroAhu.severity} />
              <Link to="/hvac/ahu/$id" params={{ id: heroAhu.id }} className="num rounded-sm border border-line px-1.5 py-0.5 text-[10px] hover:text-flow">
                DRILL DOWN
              </Link>
            </>
          }
          bodyClassName="p-0"
        >
          <AhuDiagram ahu={heroAhu} className="rounded-none border-0" />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel
          title="Active Alarms"
          subtitle={`${openAlarms.length} open`}
          className="xl:col-span-2"
          right={
            <Link to="/alarms" className="num rounded-sm border border-line px-1.5 py-0.5 text-[10px] hover:text-flow">
              ALARM CENTER
            </Link>
          }
          bodyClassName="p-0"
        >
          <div className="max-h-80 divide-y divide-line/60 overflow-y-auto">
            {openAlarms.slice(0, 12).map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2">
                <StatusLamp severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]">
                    <span className="num">{a.equipmentName}</span> · {a.description}
                  </div>
                  <div className="num truncate text-[10px] text-muted-foreground">
                    {a.equipmentType} · {a.building} {a.floor} · {since(a.raisedAt, s.now)} · {a.state.toUpperCase()}
                  </div>
                </div>
                <SeverityBadge severity={a.severity} />
              </div>
            ))}
            {openAlarms.length === 0 && <div className="px-3 py-6 text-center text-[13px] text-muted-foreground">No active alarms.</div>}
          </div>
        </Panel>

        <Panel title="UPS Fleet Load" subtitle="Live load per unit">
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {s.ups.map((u) => (
              <Link key={u.id} to="/ups/$id" params={{ id: u.id }} className="block rounded-md border border-line bg-panel-2 px-2 py-1.5 hover:border-flow/50">
                <div className="flex items-center gap-2">
                  <StatusLamp severity={u.severity} />
                  <span className="num text-[12px]">{u.name}</span>
                  <span className={`num ml-auto text-[11px] ${SEV_TEXT[u.severity]}`}>{u.comm === "offline" ? "—" : `${nf(u.loadPct, 0)}%`}</span>
                </div>
                <div className="mt-1.5">
                  <Bar pct={u.comm === "offline" ? 0 : u.loadPct} tone={u.loadPct > 88 ? "bg-warn" : "bg-flow"} />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
