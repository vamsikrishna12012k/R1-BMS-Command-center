import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AirVent,
  AlertTriangle,
  BatteryCharging,
  Bell,
  ClipboardList,
  Cpu,
  Fan,
  Gauge,
  LayoutDashboard,
  LineChart,
  Menu,
  Moon,
  Network,
  Search,
  Settings,
  Snowflake,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBms, useBmsActions } from "@/lib/bms/hooks";
import { clockTime, since } from "@/lib/bms/format";
import { useTheme } from "@/lib/theme";
import { SEV_TEXT, StatusLamp } from "./severity";
import type { Role, Severity } from "@/lib/bms/types";

const NAV: { group: string; items: { to: string; label: string; icon: typeof Zap }[] }[] = [
  {
    group: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/ups", label: "UPS Systems", icon: BatteryCharging },
    ],
  },
  {
    group: "HVAC",
    items: [
      { to: "/hvac/ahu", label: "AHUs", icon: AirVent },
      { to: "/hvac/cassette", label: "Cassette AC", icon: Snowflake },
      { to: "/hvac/vav", label: "VAV & Duct View", icon: Fan },
    ],
  },
  {
    group: "Power",
    items: [
      { to: "/energy", label: "Energy Management", icon: Gauge },
      { to: "/electrical", label: "Electrical Monitoring", icon: Zap },
      { to: "/power-flow", label: "Power Flow", icon: Network },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { to: "/alarms", label: "Alarms & Events", icon: AlertTriangle },
      { to: "/analytics", label: "Analytics & Trends", icon: LineChart },
      { to: "/explorer", label: "Equipment Explorer", icon: Cpu },
      { to: "/reports", label: "Reports", icon: ClipboardList },
    ],
  },
  {
    group: "Administration",
    items: [
      { to: "/users", label: "User Management", icon: Users },
      { to: "/audit", label: "Audit Logs", icon: Activity },
      { to: "/settings", label: "System Settings", icon: Settings },
    ],
  },
];

const ROLES: Role[] = ["Administrator", "BMS Manager", "Engineer", "Operator", "Viewer"];

export function AppShell({ children }: { children: ReactNode }) {
  const state = useBms();
  const engine = useBmsActions();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);

  const openAlarms = state.alarms.filter((a) => a.clearedAt === null);
  const critCount = openAlarms.filter((a) => a.severity === "critical").length;
  const warnCount = openAlarms.filter((a) => a.severity === "warning" || a.severity === "major").length;
  const unread = state.notifications.filter((n) => !n.read).length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all: { id: string; name: string; type: string; to: string; location: string; severity: Severity }[] = [
      ...state.ups.map((u) => ({ id: u.id, name: u.name, type: "UPS", to: `/ups/${u.id}`, location: `${u.site.building} · ${u.site.room}`, severity: u.severity })),
      ...state.ahus.map((a) => ({ id: a.id, name: a.name, type: "AHU", to: `/hvac/ahu/${a.id}`, location: `${a.site.building} · ${a.site.floor}`, severity: a.severity })),
      ...state.cassettes.map((c) => ({ id: c.id, name: c.name, type: "Cassette AC", to: `/hvac/cassette`, location: `${c.site.building} · ${c.site.room}`, severity: c.severity })),
      ...state.vavs.map((v) => ({ id: v.id, name: v.name, type: "VAV", to: `/hvac/vav`, location: `${v.site.building} · ${v.site.zone}`, severity: v.severity })),
      ...state.meters.map((m) => ({ id: m.id, name: m.name, type: "Energy Meter", to: "/energy", location: m.site.building, severity: m.severity })),
      ...state.panels.map((p) => ({ id: p.id, name: p.name, type: "Electrical Panel", to: "/electrical", location: p.site.building, severity: p.severity })),
    ];
    return all.filter((x) => `${x.id} ${x.name} ${x.type} ${x.location}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, state]);

  const linkTone: Record<typeof state.link, string> = {
    live: "text-ok",
    reconnecting: "text-warn",
    disconnected: "text-crit",
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Navigator rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 shrink-0 overflow-y-auto border-r border-line bg-sidebar transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-3">
          <div className="flex items-center gap-3">
            <img src="/R1_logo.png" alt="R1 logo" className="h-8 w-8 rounded-md object-contain" />
            <div className="leading-tight">
              <div className="font-display text-base font-semibold tracking-wide">R1 BMS Command Center</div>
            </div>
          </div>
        </div>
        <nav className="px-2 py-3">
          {NAV.map((group) => (
            <div key={group.group} className="mb-3">
              <div className="label-xs px-2 pb-1">{group.group}</div>
              {group.items.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setNavOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      active ? "bg-flow/12 text-flow" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.to === "/alarms" && critCount > 0 && (
                      <span className="num ml-auto rounded-sm bg-crit/20 px-1 text-[10px] text-crit">{critCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {navOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* live status bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2">
            <button className="rounded-md border border-line p-1.5 lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
              <Menu className="size-4" />
            </button>

            <div className="relative min-w-0 flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search equipment — UPS-07, AHU-03, VAV-12…"
                className="num w-full rounded-md border border-line bg-background py-1.5 pl-7 pr-2 text-[12px] outline-none focus:border-flow/60"
              />
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-line bg-popover shadow-xl">
                  {results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => {
                        setQuery("");
                        void navigate({ to: r.to });
                      }}
                      className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-accent"
                    >
                      <StatusLamp severity={r.severity} />
                      <span className="num text-[12px]">{r.name}</span>
                      <span className="label-xs">{r.type}</span>
                      <span className="ml-auto truncate text-[10px] text-muted-foreground">{r.location}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={cn("num hidden items-center gap-1.5 text-[11px] sm:flex", linkTone[state.link])}>
              <StatusLamp severity={state.link === "live" ? "normal" : state.link === "reconnecting" ? "warning" : "critical"} />
              {state.link.toUpperCase()}
              <span className="text-muted-foreground">{state.latencyMs}ms</span>
            </div>

            <div className="num hidden items-center gap-2 text-[11px] text-muted-foreground md:flex">
              <span>UPD {clockTime(state.lastUpdate)}</span>
              <span>GW {state.gateway.toUpperCase()}</span>
            </div>

            <Link to="/alarms" className="num flex items-center gap-1.5 rounded-sm border border-crit/40 bg-crit/10 px-1.5 py-1 text-[10px] text-crit">
              <AlertTriangle className="size-3" />
              {critCount} CRIT
            </Link>
            <Link to="/alarms" className="num hidden items-center gap-1.5 rounded-sm border border-warn/40 bg-warn/10 px-1.5 py-1 text-[10px] text-warn sm:flex">
              {warnCount} WARN
            </Link>

            <div className="relative">
              <button
                className="relative rounded-md border border-line p-1.5"
                aria-label="Notifications"
                onClick={() => {
                  setShowNotifs((v) => !v);
                  engine.markNotificationsRead();
                }}
              >
                <Bell className="size-4" />
                {unread > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-crit" />}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full z-30 mt-1 w-80 overflow-hidden rounded-md border border-line bg-popover shadow-xl">
                  <div className="label-xs border-b border-line px-3 py-2">Notification Center</div>
                  <div className="max-h-80 overflow-y-auto">
                    {state.notifications.length === 0 && (
                      <div className="px-3 py-4 text-[12px] text-muted-foreground">No notifications yet.</div>
                    )}
                    {state.notifications.map((n) => (
                      <div key={n.id} className="flex gap-2 border-b border-line/60 px-3 py-2 last:border-0">
                        <StatusLamp
                          severity={
                            n.kind === "critical" ? "critical" : n.kind === "warning" ? "warning" : n.kind === "offline" ? "offline" : n.kind === "recovery" ? "normal" : "info"
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[12px]">{n.title}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{n.detail}</div>
                          <div className="num text-[10px] text-muted-foreground">{since(n.at, state.now)} ago</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="rounded-full border border-line bg-panel-2 p-1.5 transition-colors hover:bg-accent"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <select
              value={state.role}
              onChange={(e) => engine.setRole(e.target.value as Role)}
              className="num rounded-md border border-line bg-background px-1.5 py-1 text-[11px] outline-none"
              aria-label="Active role"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {critCount > 0 && (
            <Link to="/alarms" className="flex items-center gap-2 border-t border-crit/30 bg-crit/10 px-3 py-1">
              <StatusLamp severity="critical" />
              <span className="num text-[11px] text-crit">
                {critCount} CRITICAL ALARM{critCount > 1 ? "S" : ""} ACTIVE — {openAlarms.find((a) => a.severity === "critical")?.equipmentName}:{" "}
                {openAlarms.find((a) => a.severity === "critical")?.description}
              </span>
            </Link>
          )}
        </header>

        <main className="min-w-0 flex-1 p-3">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  right,
  severity,
}: {
  eyebrow: ReactNode;
  title: string;
  right?: ReactNode;
  severity?: Severity;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="label-xs">{eyebrow}</div>
        <h1 className={cn("font-display text-2xl font-semibold leading-none tracking-wide", severity && SEV_TEXT[severity])}>{title}</h1>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
