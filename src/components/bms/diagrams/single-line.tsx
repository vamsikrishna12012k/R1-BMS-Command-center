import { cn } from "@/lib/utils";
import type { Panel as PanelNode } from "@/lib/bms/types";
import { nf } from "@/lib/bms/format";

const POS: Record<string, { x: number; y: number }> = {
  "SRC-GRID": { x: 60, y: 20 },
  "SRC-GEN": { x: 300, y: 20 },
  "PNL-MAIN": { x: 180, y: 100 },
  "PNL-DB1": { x: 60, y: 178 },
  "PNL-DB2": { x: 300, y: 178 },
  "PNL-UPSA": { x: 60, y: 256 },
  "PNL-UPSB": { x: 300, y: 256 },
  "LOAD-CRIT-A": { x: 60, y: 334 },
  "LOAD-CRIT-B": { x: 300, y: 334 },
  "LOAD-MECH": { x: 540, y: 256 },
};

const W = 172;
const H = 56;

export function SingleLineDiagram({
  panels,
  onSelect,
  selectedId,
  className,
}: {
  panels: PanelNode[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  className?: string;
}) {
  const byId = new Map(panels.map((p) => [p.id, p]));

  return (
    <div className={cn("panel-surface grid-backdrop overflow-x-auto", className)}>
      <svg viewBox="0 0 760 420" className="h-full w-full min-w-[620px]" role="img" aria-label="Electrical single line diagram">
        {panels.map((p) => {
          if (!p.parentId) return null;
          const from = POS[p.parentId];
          const to = POS[p.id];
          const parent = byId.get(p.parentId);
          if (!from || !to || !parent) return null;
          const live = parent.energized && p.breakerClosed && p.energized;
          const stops = parent.energized && !p.breakerClosed;
          const midY = from.y + H + (to.y - from.y - H) / 2;
          const d = `M ${from.x + W / 2} ${from.y + H} V ${midY} H ${to.x + W / 2} V ${to.y}`;
          return (
            <g key={`link-${p.id}`}>
              <path d={d} fill="none" stroke="var(--line)" strokeWidth={2} />
              {live && <path d={d} fill="none" stroke="var(--flow)" strokeWidth={2} className="flow-dash" />}
              {/* breaker symbol */}
              <rect
                x={to.x + W / 2 - 7}
                y={to.y - 20}
                width={14}
                height={14}
                rx={2}
                fill="var(--panel)"
                stroke={p.breakerClosed ? "var(--flow)" : "var(--sev-major)"}
                strokeWidth={1.4}
              />
              {!p.breakerClosed && (
                <line x1={to.x + W / 2 - 5} y1={to.y - 17} x2={to.x + W / 2 + 5} y2={to.y - 9} stroke="var(--sev-major)" strokeWidth={1.6} />
              )}
              {stops && (
                <text x={to.x + W / 2 + 12} y={to.y - 8} fontSize={9} fontFamily="var(--font-mono)" fill="var(--sev-major)">
                  OPEN
                </text>
              )}
            </g>
          );
        })}

        {panels.map((p) => {
          const pos = POS[p.id];
          if (!pos) return null;
          const live = p.energized;
          const stroke = selectedId === p.id ? "var(--flow)" : live ? "color-mix(in oklab, var(--flow) 55%, var(--line))" : "var(--line)";
          return (
            <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : "default" }}>
              <rect
                x={pos.x}
                y={pos.y}
                width={W}
                height={H}
                rx={6}
                fill={live ? "color-mix(in oklab, var(--flow) 8%, var(--panel-2))" : "var(--panel-2)"}
                stroke={stroke}
                strokeWidth={selectedId === p.id ? 1.8 : 1.2}
              />
              <text x={pos.x + 10} y={pos.y + 21} fontSize={12} fontFamily="var(--font-display)" fill={live ? "var(--foreground)" : "var(--muted-foreground)"}>
                {p.name}
              </text>
              <text x={pos.x + 10} y={pos.y + 39} fontSize={10} fontFamily="var(--font-mono)" fill={live ? "var(--flow)" : "var(--sev-offline)"}>
                {live ? `${nf(p.kw, 0)} kW · ${nf(p.voltage, 0)} V · ${nf(p.current, 0)} A` : "DE-ENERGIZED"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
