import { cn } from "@/lib/utils";
import type { Ahu, Vav } from "@/lib/bms/types";
import { nf } from "@/lib/bms/format";

function vavTone(v: Vav) {
  if (v.comm === "offline") return "var(--sev-offline)";
  if (v.severity === "warning") return "var(--sev-warn)";
  if (v.damperPct === 0) return "var(--muted-foreground)";
  return "var(--flow)";
}

export function DuctView({
  ahu,
  vavs,
  selectedId,
  onSelect,
  className,
}: {
  ahu: Ahu;
  vavs: Vav[];
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
}) {
  const running = ahu.running && ahu.comm !== "offline";
  const width = 880;
  const branchGap = (width - 200) / Math.max(vavs.length, 1);

  return (
    <div className={cn("panel-surface grid-backdrop overflow-x-auto", className)}>
      <svg viewBox={`0 0 ${width} 300`} className="h-full w-full min-w-[640px]" role="img" aria-label={`${ahu.name} duct network`}>
        <defs>
          <linearGradient id="duct-main" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--cold)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--cold)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {/* AHU source */}
        <rect x={16} y={74} width={104} height={62} rx={8} fill="var(--panel-2)" stroke={running ? "var(--flow)" : "var(--line)"} />
        <text x={68} y={100} textAnchor="middle" fontSize={13} fontFamily="var(--font-display)" fill="var(--foreground)">
          {ahu.name}
        </text>
        <text x={68} y={118} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill={running ? "var(--flow)" : "var(--muted-foreground)"}>
          {running ? `${nf(ahu.airflowCmh, 0)} m³/h` : "NO FLOW"}
        </text>

        {/* main supply duct */}
        <path d={`M 120 105 H ${width - 40}`} stroke="var(--line)" strokeWidth={22} strokeLinecap="round" fill="none" />
        {running && (
          <>
            <path d={`M 120 105 H ${width - 40}`} stroke="url(#duct-main)" strokeWidth={12} strokeLinecap="round" fill="none" opacity={0.22} />
            <path
              d={`M 120 105 H ${width - 40}`}
              stroke="url(#duct-main)"
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
              className="flow-dash"
              opacity={0.8}
            />
          </>
        )}
        <text x={130} y={82} fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
          MAIN SUPPLY DUCT
        </text>

        {vavs.map((v, i) => {
          const x = 170 + i * branchGap;
          const tone = vavTone(v);
          const flowing = running && v.damperPct > 0 && v.comm !== "offline";
          const dashSpeed = v.damperPct > 70 ? "flow-dash" : "flow-dash-slow";
          return (
            <g key={v.id} onClick={() => onSelect?.(v.id)} style={{ cursor: onSelect ? "pointer" : "default" }}>
              <path d={`M ${x} 105 V 180`} stroke="var(--line)" strokeWidth={12} strokeLinecap="round" fill="none" />
              {flowing && (
                <>
                  <path d={`M ${x} 105 V 180`} stroke={tone} strokeWidth={Math.max(2, (v.damperPct / 100) * 7)} fill="none" opacity={0.2} strokeLinecap="round" />
                  <path d={`M ${x} 105 V 180`} stroke={tone} strokeWidth={Math.max(2, (v.damperPct / 100) * 7)} className={dashSpeed} fill="none" opacity={0.85} />
                  <circle r={2.6} fill={tone} opacity={0.9}>
                    <animateMotion dur={`${v.damperPct > 70 ? 1.8 : 3}s`} repeatCount="indefinite" path={`M ${x} 105 V 180`} calcMode="linear" />
                  </circle>
                </>
              )}

              {/* damper blade */}
              <line
                x1={x - 12}
                y1={150}
                x2={x + 12}
                y2={150}
                stroke={tone}
                strokeWidth={3}
                strokeLinecap="round"
                transform={`rotate(${90 - (v.damperPct / 100) * 90} ${x} 150)`}
                style={{ transition: "transform 1s ease" }}
              />
              <rect
                x={x - 46}
                y={182}
                width={92}
                height={62}
                rx={5}
                fill={selectedId === v.id ? "color-mix(in oklab, var(--flow) 14%, var(--panel-2))" : "var(--panel-2)"}
                stroke={selectedId === v.id ? "var(--flow)" : tone}
                strokeWidth={selectedId === v.id ? 1.6 : 1}
              />
              <text x={x} y={200} textAnchor="middle" fontSize={11} fontFamily="var(--font-display)" fill="var(--foreground)">
                {v.name}
              </text>
              <text x={x} y={216} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill={tone}>
                {v.comm === "offline" ? "COMM FAIL" : `${nf(v.damperPct, 0)}%`}
              </text>
              <text x={x} y={232} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
                {v.comm === "offline" ? "—" : `${nf(v.airflowCmh, 0)} m³/h`}
              </text>
              <text x={x} y={262} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
                {v.comm === "offline"
                  ? "NO DATA"
                  : v.damperPct === 0
                    ? "CLOSED"
                    : v.damperPct > 70
                      ? "OPEN · HIGH"
                      : "PARTIAL · MED"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
