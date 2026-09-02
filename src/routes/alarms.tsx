import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { SEV_ORDER, SeverityBadge } from "@/components/bms/severity";
import { since, stamp } from "@/lib/bms/format";
import { cn } from "@/lib/utils";
import type { AlarmState } from "@/lib/bms/types";

export const Route = createFileRoute("/alarms")({
  head: () => ({
    meta: [
      { title: "Alarms & Events — Meridian BMS" },
      { name: "description", content: "Central alarm console: acknowledge, investigate, comment on and close alarms across every building system." },
      { property: "og:title", content: "Alarms & Events — Meridian BMS" },
      { property: "og:description", content: "Acknowledge and manage active building alarms with full history." },
    ],
  }),
  component: AlarmsPage,
});

const STATES: AlarmState[] = ["new", "active", "acknowledged", "investigating", "resolved", "closed"];

function AlarmsPage() {
  const s = useBms();
  const engine = useBmsActions();
  const [scope, setScope] = useState<"open" | "all">("open");
  const [sev, setSev] = useState<"all" | "critical" | "major" | "warning">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const list = useMemo(() => {
    let l = [...s.alarms];
    if (scope === "open") l = l.filter((a) => a.clearedAt === null && a.state !== "closed");
    if (sev !== "all") l = l.filter((a) => a.severity === sev);
    return l.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.raisedAt - a.raisedAt);
  }, [s.alarms, scope, sev]);

  const active = s.alarms.filter((a) => a.clearedAt === null);
  const sel = s.alarms.find((a) => a.id === selected) ?? null;

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Intelligence"
        title="Alarms & Events"
        right={
          <div className="flex flex-wrap gap-1">
            {(["open", "all"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setScope(v)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] capitalize",
                  scope === v ? "border-primary bg-primary text-primary-foreground" : "border-line hover:bg-accent",
                )}
              >
                {v}
              </button>
            ))}
            <select
              value={sev}
              onChange={(e) => setSev(e.target.value as typeof sev)}
              className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px]"
              aria-label="Filter severity"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Critical" value={active.filter((a) => a.severity === "critical").length} tone="text-crit" />
        <Metric label="Major" value={active.filter((a) => a.severity === "major").length} tone="text-major" />
        <Metric label="Warning" value={active.filter((a) => a.severity === "warning").length} tone="text-warn" />
        <Metric label="Unacknowledged" value={active.filter((a) => a.state === "new" || a.state === "active").length} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Alarm List" subtitle={`${list.length} shown`} className="xl:col-span-2" bodyClassName="p-0">
          <div className="max-h-[520px] overflow-y-auto">
            {list.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-line/60 px-3 py-2 text-left hover:bg-accent",
                  selected === a.id && "bg-accent",
                )}
              >
                <SeverityBadge severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]">
                    <span className="num">{a.equipmentName}</span> · {a.description}
                  </div>
                  <div className="num truncate text-[11px] text-muted-foreground">
                    {a.equipmentType} · {a.building} {a.floor} · raised {since(a.raisedAt, s.now)} ago
                  </div>
                </div>
                <span className="num rounded-full border border-line px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{a.state}</span>
              </button>
            ))}
            {list.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No alarms match this filter.</p>}
          </div>
        </Panel>

        <Panel title={sel ? sel.equipmentName : "Alarm Detail"} subtitle={sel ? sel.description : "Select an alarm"}>
          {sel ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={sel.severity} />
                <span className="num text-[11px] text-muted-foreground">Raised {stamp(sel.raisedAt)}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {STATES.map((st) => (
                  <button
                    key={st}
                    onClick={() => engine.setAlarmState(sel.id, st)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] capitalize",
                      sel.state === st ? "border-primary bg-primary text-primary-foreground" : "border-line hover:bg-accent",
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div>
                <div className="label-xs mb-1">Comments</div>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {sel.comments.map((c, i) => (
                    <div key={i} className="rounded-md border border-line bg-panel-2 px-2.5 py-1.5">
                      <div className="num text-[10px] text-muted-foreground">
                        {c.user} · {stamp(c.at)}
                      </div>
                      <div className="text-[12px]">{c.text}</div>
                    </div>
                  ))}
                  {sel.comments.length === 0 && <p className="text-[12px] text-muted-foreground">No comments yet.</p>}
                </div>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!comment.trim()) return;
                    engine.addAlarmComment(sel.id, comment.trim());
                    setComment("");
                  }}
                >
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note…"
                    className="flex-1 rounded-full border border-line bg-background px-3 py-1.5 text-[12px] outline-none focus:border-primary"
                  />
                  <button className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground">Post</button>
                </form>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Select an alarm to manage it.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
