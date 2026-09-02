import { cn } from "@/lib/utils";
import type { Ahu } from "@/lib/bms/types";
import { nf } from "@/lib/bms/format";

/** Conceptual AHU section view: return air → filter → cooling coil → supply fan → supply air. */
export function AhuDiagram({ ahu, className }: { ahu: Ahu; className?: string }) {
  const running = ahu.running && ahu.comm !== "offline";
  const speed = running ? Math.max(1.4, 5.2 - (ahu.fanSpeedPct / 100) * 3.2) : 0;
  const filterAlarm = ahu.filterDp > 300;
  const tempAlarm = Math.abs(ahu.supplyTempC - ahu.setpointC) > 2.5;
  const lanes = 5;
  const cycle = Math.max(2.6, 6.4 - (ahu.fanSpeedPct / 100) * 3.4);

  return (
    <div className={cn("panel-surface grid-backdrop overflow-hidden", className)}>
      <svg viewBox="0 0 860 340" className="h-full w-full" role="img" aria-label={`${ahu.name} airflow diagram`}>
        <defs>
          <linearGradient id={`air-${ahu.id}`} x1="0" x2="1">
            <stop offset="0%" stopColor="var(--warm)" />
            <stop offset="45%" stopColor="var(--sev-warn)" />
            <stop offset="100%" stopColor="var(--cold)" />
          </linearGradient>
          {/* streamline colour transitions warm → cold as air crosses the coil */}
          <linearGradient id={`stream-${ahu.id}`} x1="0" x2="1">
            <stop offset="0%" stopColor="var(--warm)" />
            <stop offset="38%" stopColor="var(--sev-warn)" />
            <stop offset="62%" stopColor="var(--cold)" />
            <stop offset="100%" stopColor="var(--cold)" />
          </linearGradient>
          {/* soft entry/exit so streams never appear to pop in */}
          <linearGradient id={`fade-${ahu.id}`} x1="0" x2="1">
            <stop offset="0%" stopColor="#000" />
            <stop offset="6%" stopColor="#fff" />
            <stop offset="94%" stopColor="#fff" />
            <stop offset="100%" stopColor="#000" />
          </linearGradient>
          <mask id={`airmask-${ahu.id}`}>
            <rect x="0" y="0" width="860" height="340" fill={`url(#fade-${ahu.id})`} />
          </mask>
          <radialGradient id={`hub-${ahu.id}`}>
            <stop offset="0%" stopColor="var(--flow)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--flow)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* casing */}
        <rect x={150} y={70} width={560} height={150} rx={10} fill="var(--panel-2)" stroke="var(--line)" />
        <rect x={150} y={70} width={560} height={150} rx={10} fill={`url(#air-${ahu.id})`} opacity={running ? 0.12 : 0.04} />

        {/* return air duct */}
        <path d="M 20 120 H 152" stroke="var(--line)" strokeWidth={26} fill="none" strokeLinecap="round" />
        <path d="M 20 120 H 152" stroke="var(--warm)" strokeWidth={26} opacity={0.16} fill="none" strokeLinecap="round" />
        <text x={22} y={100} fontSize={11} fontFamily="var(--font-mono)" fill="var(--warm)">
          RETURN AIR {nf(ahu.returnTempC)}°C
        </text>

        {/* supply air duct */}
        <path d="M 708 170 H 845" stroke="var(--line)" strokeWidth={26} fill="none" strokeLinecap="round" />
        <path d="M 708 170 H 845" stroke="var(--cold)" strokeWidth={26} opacity={0.18} fill="none" strokeLinecap="round" />
        <text x={706} y={210} fontSize={11} fontFamily="var(--font-mono)" fill="var(--cold)">
          SUPPLY AIR {nf(ahu.supplyTempC)}°C
        </text>

        {/* laminar airflow — long, even, gradient-coloured streamlines that fade at both ends */}
        {running && (
          <g mask={`url(#airmask-${ahu.id})`}>
            {Array.from({ length: lanes }).map((_, i) => {
              const offset = (i - (lanes - 1) / 2) * 15;
              const d = `M 20 ${120 + offset * 0.55} C 150 ${120 + offset * 0.55}, 250 ${145 + offset}, 420 ${145 + offset} C 590 ${145 + offset}, 640 ${170 + offset * 0.5}, 845 ${170 + offset * 0.45}`;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={`url(#stream-${ahu.id})`}
                  strokeWidth={i === Math.floor(lanes / 2) ? 2 : 1.3}
                  strokeLinecap="round"
                  style={{
                    ["--stream-len" as string]: "1000",
                    ["--stream-opacity" as string]: i === Math.floor(lanes / 2) ? 0.65 : 0.4,
                    strokeDasharray: "150 850",
                    animation: `stream-draw ${cycle}s linear ${(i * cycle) / lanes}s infinite`,
                  }}
                />
              );
            })}
          </g>
        )}

        {/* filter bank */}
        <g>
          {[0, 1].map((k) => (
            <g key={k}>
              <rect
                x={190 + k * 24}
                y={86}
                width={16}
                height={118}
                rx={3}
                fill={filterAlarm ? "color-mix(in oklab, var(--sev-warn) 12%, transparent)" : "transparent"}
                stroke={filterAlarm ? "var(--sev-warn)" : "var(--muted-foreground)"}
                strokeOpacity={0.7}
                className={filterAlarm ? "soft-breathe" : undefined}
              />
              {[0, 1, 2, 3, 4, 5].map((j) => (
                <line
                  key={j}
                  x1={190 + k * 24}
                  y1={92 + j * 20}
                  x2={206 + k * 24}
                  y2={102 + j * 20}
                  stroke={filterAlarm ? "var(--sev-warn)" : "var(--muted-foreground)"}
                  strokeOpacity={0.45}
                  strokeWidth={1}
                />
              ))}
            </g>
          ))}
          <text x={210} y={238} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill={filterAlarm ? "var(--sev-warn)" : "var(--muted-foreground)"}>
            FILTER {nf(ahu.filterDp, 0)} Pa
          </text>
        </g>

        {/* damper blades */}
        <g>
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={268}
              y1={96 + i * 30}
              x2={302}
              y2={96 + i * 30}
              stroke="var(--copper)"
              strokeWidth={4}
              strokeLinecap="round"
              transform={`rotate(${-(ahu.damperPct / 100) * 75} 285 ${96 + i * 30})`}
              style={{ transition: "transform 1.2s cubic-bezier(0.32,0.72,0,1)" }}
            />
          ))}
          <text x={285} y={238} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--copper)">
            DAMPER {nf(ahu.damperPct, 0)}%
          </text>
        </g>

        {/* cooling coil — fill level tracks valve position */}
        <g>
          <rect x={340} y={88} width={62} height={124} rx={4} fill="none" stroke="var(--line)" />
          <rect
            x={340}
            y={88}
            width={62}
            height={124}
            rx={4}
            fill="var(--cold)"
            opacity={running ? 0.05 + (ahu.valvePct / 100) * 0.16 : 0.03}
            style={{ transition: "opacity 1.2s ease" }}
          />
          {[350, 382].map((x) => (
            <path
              key={x}
              d={`M ${x} 92 q 22 14 0 28 q -22 14 0 28 q 22 14 0 28 q -22 14 0 28 q 22 14 0 28`}
              fill="none"
              stroke={running ? "var(--cold)" : "var(--muted-foreground)"}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={running ? 0.55 + (ahu.valvePct / 100) * 0.45 : 0.35}
              style={{ transition: "opacity 1.2s ease" }}
            />
          ))}
          <text x={372} y={238} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill={tempAlarm ? "var(--sev-major)" : "var(--cold)"}>
            COOLING VALVE {nf(ahu.valvePct, 0)}%
          </text>
        </g>

        {/* supply fan */}
        <g transform="translate(560,145)">
          {running && <circle r={62} fill={`url(#hub-${ahu.id})`} />}
          <circle r={46} fill="var(--panel)" stroke={running ? "var(--flow)" : "var(--line)"} strokeWidth={1.5} />
          <g style={{ transformOrigin: "center", animation: running ? `spin ${speed}s linear infinite` : "none" }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <path
                key={deg}
                d="M 0 0 C 12 -10 26 -12 36 -4 C 26 6 12 6 0 0 Z"
                fill={running ? "var(--flow)" : "var(--muted-foreground)"}
                opacity={running ? 0.7 : 0.3}
                transform={`rotate(${deg})`}
              />
            ))}
          </g>
          <circle r={7} fill="var(--panel-2)" stroke={running ? "var(--flow)" : "var(--line)"} />
          <text y={78} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill={running ? "var(--flow)" : "var(--muted-foreground)"}>
            FAN {nf(ahu.fanSpeedPct, 0)}%
          </text>
        </g>

        <text x={152} y={62} fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
          {ahu.name} · SETPOINT {nf(ahu.setpointC, 1)}°C · AIRFLOW {nf(ahu.airflowCmh, 0)} m³/h · {running ? "RUNNING" : ahu.comm === "offline" ? "COMMS LOST" : "STOPPED"}
        </text>
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { svg [style*="spin"] { animation: none !important; } }`}</style>
    </div>
  );
}
