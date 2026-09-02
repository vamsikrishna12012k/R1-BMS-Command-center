import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBms } from "@/lib/bms/hooks";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { stamp } from "@/lib/bms/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs — R1 BMS Command Center" },
      { name: "description", content: "Immutable record of every control command, setpoint change and denied action across the building management platform." },
      { property: "og:title", content: "Audit Logs — R1 BMS Command Center" },
      { property: "og:description", content: "Traceable log of all operator commands and system changes." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const s = useBms();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "Successful" | "Denied">("all");

  const rows = useMemo(
    () =>
      s.audit.filter(
        (a) =>
          (status === "all" || a.status === status) &&
          `${a.user} ${a.role} ${a.equipment} ${a.action} ${a.next}`.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [s.audit, q, status],
  );

  function exportCsv() {
    const head = "timestamp,user,role,equipment,action,previous,next,status";
    const body = rows.map((a) => [stamp(a.at), a.user, a.role, a.equipment, a.action, a.previous, a.next, a.status].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bms-audit-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Administration"
        title="Audit Logs"
        right={
          <div className="flex flex-wrap gap-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actions…"
              className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] outline-none focus:border-primary"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12px]"
              aria-label="Filter status"
            >
              <option value="all">All results</option>
              <option value="Successful">Successful</option>
              <option value="Denied">Denied</option>
            </select>
            <button onClick={exportCsv} className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground">
              Export CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Total Entries" value={s.audit.length} />
        <Metric label="Successful" value={s.audit.filter((a) => a.status === "Successful").length} tone="text-ok" />
        <Metric label="Denied" value={s.audit.filter((a) => a.status === "Denied").length} tone="text-crit" />
        <Metric label="Active Session" value={s.user} hint={s.role} />
      </div>

      <Panel title="Command History" subtitle={`${rows.length} entries`} bodyClassName="p-0">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 bg-panel-2">
              <tr className="label-xs">
                <th className="px-3 py-2 font-normal">Time</th>
                <th className="px-3 py-2 font-normal">User</th>
                <th className="px-3 py-2 font-normal">Equipment</th>
                <th className="px-3 py-2 font-normal">Action</th>
                <th className="px-3 py-2 font-normal">Change</th>
                <th className="px-3 py-2 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-line/60">
                  <td className="num whitespace-nowrap px-3 py-2 text-muted-foreground">{stamp(a.at)}</td>
                  <td className="px-3 py-2">
                    {a.user}
                    <div className="label-xs">{a.role}</div>
                  </td>
                  <td className="num px-3 py-2">{a.equipment}</td>
                  <td className="px-3 py-2">{a.action}</td>
                  <td className="num px-3 py-2 text-muted-foreground">
                    {a.previous} → <span className="text-foreground">{a.next}</span>
                  </td>
                  <td className={cn("px-3 py-2 font-medium", a.status === "Denied" ? "text-crit" : "text-ok")}>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No audit entries match this filter.</p>}
        </div>
      </Panel>
    </div>
  );
}
