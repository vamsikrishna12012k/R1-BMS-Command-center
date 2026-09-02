import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { ROLE_RANK } from "@/lib/bms/engine";
import { PageHeader } from "@/components/bms/app-shell";
import { Panel, Metric } from "@/components/bms/panel";
import { since } from "@/lib/bms/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/bms/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Management — R1 BMS Command Center" },
      { name: "description", content: "Operator roster and role-based access control matrix for supervisory, engineering and view-only building system access." },
      { property: "og:title", content: "User Management — R1 BMS Command Center" },
      { property: "og:description", content: "Manage operators and role-based permissions." },
    ],
  }),
  component: UsersPage,
});

const ROLES: Role[] = ["Administrator", "BMS Manager", "Engineer", "Operator", "Viewer"];

const CAPABILITIES: { label: string; minRole: Role }[] = [
  { label: "View dashboards & trends", minRole: "Viewer" },
  { label: "Acknowledge alarms", minRole: "Operator" },
  { label: "Adjust HVAC setpoints", minRole: "Operator" },
  { label: "Start / stop equipment", minRole: "Engineer" },
  { label: "UPS mode transfer", minRole: "BMS Manager" },
  { label: "Breaker switching", minRole: "BMS Manager" },
  { label: "User & system settings", minRole: "Administrator" },
];

const ROSTER: { name: string; email: string; role: Role; shift: string; minsAgo: number }[] = [
  { name: "Vamsi", email: "vkrishna11@r1rcm.com", role: "Administrator", shift: "Day", minsAgo: 3 },
  { name: "Nitesh", email: "nbjain@r1rcm.com", role: "BMS Manager", shift: "Day", minsAgo: 12 },
  { name: "Vamsi", email: "vamsi@r1rcm.com", role: "Engineer", shift: "Day", minsAgo: 41 },
  { name: "Madhumitha", email: "madhumitha@r1bms.local", role: "Engineer", shift: "Night", minsAgo: 190 },
  { name: "Jagadish Nathari", email: "jagadish@r1bms.local", role: "Operator", shift: "Night", minsAgo: 8 },
  { name: "Raghu Kathroju", email: "raghu@r1bms.local", role: "Operator", shift: "Swing", minsAgo: 76 },
  { name: "Test", email: "test@r1bms.local", role: "Viewer", shift: "Day", minsAgo: 320 },
];

function UsersPage() {
  const s = useBms();
  const engine = useBmsActions();

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Administration"
        title="User Management"
        right={
          <select
            value={s.role}
            onChange={(e) => engine.setRole(e.target.value as Role)}
            className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12px]"
            aria-label="Active session role"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                Session role: {r}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Accounts" value={ROSTER.length} />
        <Metric label="Online Now" value={ROSTER.filter((u) => u.minsAgo < 30).length} tone="text-ok" />
        <Metric label="Privileged" value={ROSTER.filter((u) => ROLE_RANK[u.role] >= ROLE_RANK["BMS Manager"]).length} />
        <Metric label="Your Role" value={s.role} hint={s.user} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Operator Roster" subtitle="Directory-synced accounts" bodyClassName="p-0">
          <div className="divide-y divide-line/60">
            {ROSTER.map((u) => (
              <div key={u.email} className="flex items-center gap-3 px-3 py-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold">
                  {u.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{u.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[12px]">{u.role}</div>
                  <div className="num text-[11px] text-muted-foreground">
                    {u.shift} · {since(s.now - u.minsAgo * 60_000, s.now)} ago
                  </div>
                </div>
                <span className={cn("size-2 shrink-0 rounded-full", u.minsAgo < 30 ? "bg-ok" : "bg-offline")} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Permission Matrix" subtitle="Capabilities granted per role" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-panel-2">
                <tr className="label-xs">
                  <th className="px-3 py-2 font-normal">Capability</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-2 py-2 text-center font-normal">
                      {r.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((c) => (
                  <tr key={c.label} className="border-t border-line/60">
                    <td className="px-3 py-2">{c.label}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-2 py-2 text-center">
                        {ROLE_RANK[r] >= ROLE_RANK[c.minRole] ? (
                          <Check className="mx-auto size-3.5 text-ok" />
                        ) : (
                          <Minus className="mx-auto size-3.5 text-muted-foreground/50" />
                        )}
                      </td>
                    ))}
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
