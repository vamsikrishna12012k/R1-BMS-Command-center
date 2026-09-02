import { cn } from "@/lib/utils";
import type { CommStatus, Severity } from "@/lib/bms/types";

export const SEV_TEXT: Record<Severity, string> = {
  normal: "text-ok",
  info: "text-info",
  warning: "text-warn",
  major: "text-major",
  critical: "text-crit",
  offline: "text-offline",
};

export const SEV_BG: Record<Severity, string> = {
  normal: "bg-ok",
  info: "bg-info",
  warning: "bg-warn",
  major: "bg-major",
  critical: "bg-crit",
  offline: "bg-offline",
};

export const SEV_LABEL: Record<Severity, string> = {
  normal: "HEALTHY",
  info: "STANDBY",
  warning: "WARNING",
  major: "MAJOR",
  critical: "CRITICAL",
  offline: "OFFLINE",
};

export const SEV_ORDER: Record<Severity, number> = {
  critical: 0,
  offline: 1,
  major: 2,
  warning: 3,
  info: 4,
  normal: 5,
};

export function StatusLamp({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        SEV_BG[severity],
        (severity === "critical" || severity === "major") && "lamp-pulse",
        className,
      )}
      style={severity === "normal" || severity === "critical" ? { boxShadow: "0 0 7px currentColor" } : undefined}
    />
  );
}

export function SeverityBadge({ severity, label }: { severity: Severity; label?: string }) {
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] tracking-wider",
        SEV_TEXT[severity],
      )}
      style={{ borderColor: "currentColor", backgroundColor: "color-mix(in oklab, currentColor 12%, transparent)" }}
    >
      <StatusLamp severity={severity} className="size-1.5" />
      {label ?? SEV_LABEL[severity]}
    </span>
  );
}

export function CommBadge({ comm }: { comm: CommStatus }) {
  const sev: Severity = comm === "online" ? "normal" : comm === "degraded" ? "warning" : "offline";
  return <SeverityBadge severity={sev} label={comm.toUpperCase()} />;
}
