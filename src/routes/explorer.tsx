import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { SeverityBadge, StatusLamp } from "@/components/bms/severity";
import { since } from "@/lib/bms/format";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/bms/types";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Equipment Explorer — Meridian BMS" },
      { name: "description", content: "Browse the full site hierarchy — campus, building, floor, zone and room — and jump to any connected device." },
      { property: "og:title", content: "Equipment Explorer — Meridian BMS" },
      { property: "og:description", content: "Navigate every device in the campus equipment hierarchy." },
    ],
  }),
  component: ExplorerPage,
});

interface Node {
  id: string;
  name: string;
  type: string;
  building: string;
  floor: string;
  room: string;
  severity: Severity;
  lastComm: number;
  to: string;
}

function ExplorerPage() {
  const s = useBms();
  const [q, setQ] = useState("");
  const [building, setBuilding] = useState<string>("all");

  const nodes: Node[] = useMemo(
    () => [
      ...s.ups.map((u) => ({ id: u.id, name: u.name, type: "UPS", building: u.site.building, floor: u.site.floor, room: u.site.room, severity: u.severity, lastComm: u.lastComm, to: `/ups/${u.id}` })),
      ...s.ahus.map((a) => ({ id: a.id, name: a.name, type: "AHU", building: a.site.building, floor: a.site.floor, room: a.site.zone, severity: a.severity, lastComm: a.lastComm, to: `/hvac/ahu/${a.id}` })),
      ...s.cassettes.map((c) => ({ id: c.id, name: c.name, type: "Cassette AC", building: c.site.building, floor: c.site.floor, room: c.site.room, severity: c.severity, lastComm: c.lastComm, to: "/hvac/cassette" })),
      ...s.vavs.map((v) => ({ id: v.id, name: v.name, type: "VAV", building: v.site.building, floor: v.site.floor, room: v.site.zone, severity: v.severity, lastComm: v.lastComm, to: "/hvac/vav" })),
      ...s.meters.map((m) => ({ id: m.id, name: m.name, type: "Meter", building: m.site.building, floor: m.site.floor, room: m.site.room, severity: m.severity, lastComm: s.lastUpdate, to: "/energy" })),
      ...s.panels.map((p) => ({ id: p.id, name: p.name, type: "Panel", building: p.site.building, floor: p.site.floor, room: p.site.room, severity: p.severity, lastComm: s.lastUpdate, to: "/electrical" })),
    ],
    [s],
  );

  const buildings = Array.from(new Set(nodes.map((n) => n.building)));
  const filtered = nodes.filter(
    (n) =>
      (building === "all" || n.building === building) &&
      `${n.id} ${n.name} ${n.type} ${n.floor} ${n.room}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const grouped = filtered.reduce<Record<string, Node[]>>((acc, n) => {
    const key = `${n.building} · ${n.floor}`;
    (acc[key] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Intelligence"
        title="Equipment Explorer"
        right={
          <div className="flex flex-wrap gap-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter devices…"
              className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] outline-none focus:border-primary"
            />
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12px]"
              aria-label="Filter building"
            >
              <option value="all">All buildings</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Devices" value={nodes.length} />
        <Metric label="Matching Filter" value={filtered.length} tone="text-flow" />
        <Metric label="In Alarm" value={filtered.filter((n) => n.severity !== "normal" && n.severity !== "info").length} tone="text-warn" />
        <Metric label="Buildings" value={buildings.length} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {Object.entries(grouped).map(([group, items]) => (
          <Panel key={group} title={group} subtitle={`${items.length} devices`} bodyClassName="p-0">
            <div className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <Link key={`${n.type}-${n.id}`} to={n.to} className={cn("flex items-center gap-2 border-b border-line/60 px-3 py-2 hover:bg-accent")}>
                  <StatusLamp severity={n.severity} />
                  <span className="num text-[12px]">{n.name}</span>
                  <span className="label-xs">{n.type}</span>
                  <span className="ml-auto truncate text-[11px] text-muted-foreground">{n.room}</span>
                  <span className="num text-[10px] text-muted-foreground">{since(n.lastComm, s.now)}</span>
                  <SeverityBadge severity={n.severity} />
                </Link>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
