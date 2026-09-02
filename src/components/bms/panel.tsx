import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  right?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  return (
    <section className={cn("panel-surface flex flex-col overflow-hidden", className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
          <div className="min-w-0">
            {title && <h2 className="truncate font-display text-base font-semibold tracking-wide">{title}</h2>}
            {subtitle && <p className="label-xs truncate">{subtitle}</p>}
          </div>
          {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  unit,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  unit?: string | undefined;
  tone?: string | undefined;
  hint?: ReactNode | undefined;
}) {
  return (
    <div className="rounded-md border border-line bg-panel-2 px-2.5 py-2">
      <div className="label-xs truncate">{label}</div>
      <div className={cn("num mt-0.5 text-lg leading-none", tone ?? "text-foreground")}>
        {value}
        {unit && <span className="ml-0.5 text-[11px] text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="num mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Bar({ pct, tone = "bg-flow" }: { pct: number; tone?: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-[width] duration-700", tone)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
