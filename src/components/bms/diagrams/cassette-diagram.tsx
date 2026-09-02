import { cn } from "@/lib/utils";
import type { Cassette } from "@/lib/bms/types";
import { nf } from "@/lib/bms/format";

/** Conceptual 4-way ceiling cassette seen from below, with discharge airflow. */
export function CassetteDiagram({ unit, className }: { unit: Cassette; className?: string }) {
  const running = unit.on && unit.comm !== "offline";
  const dur = unit.fanSpeed === "high" ? 2.6 : unit.fanSpeed === "medium" ? 3.4 : unit.fanSpeed === "low" ? 4.4 : 3.6;
  const tone = unit.mode === "cool" ? "var(--cold)" : unit.mode === "dry" ? "var(--copper)" : "var(--flow)";

  const streams = [
    { from: [92, 168], to: [30, 226] },
    { from: [228, 168], to: [290, 226] },
    { from: [92, 72], to: [30, 22] },
    { from: [228, 72], to: [290, 22] },
  ] as const;

  return (
    <div className={cn("panel-surface grid-backdrop", className)}>
      <svg viewBox="0 0 320 260" className="h-full w-full" role="img" aria-label={`${unit.name} cassette unit`}>
        <defs>
          <radialGradient id={`cass-glow-${unit.id}`}>
            <stop offset="0%" stopColor={tone} stopOpacity="0.22" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </radialGradient>
        </defs>

        {running && <circle cx={160} cy={120} r={110} fill={`url(#cass-glow-${unit.id})`} className="soft-breathe" />}

        <rect x={70} y={50} width={180} height={140} rx={14} fill="var(--panel-2)" stroke={running ? tone : "var(--line)"} />
        <rect x={92} y={72} width={136} height={96} rx={8} fill="none" stroke="var(--line)" strokeDasharray="3 5" />

        {/* return grille */}
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={116} y1={92 + i * 19} x2={204} y2={92 + i * 19} stroke="var(--line)" strokeOpacity={0.7} strokeWidth={1} />
        ))}

        <circle cx={160} cy={120} r={27} fill="var(--panel)" stroke={running ? tone : "var(--muted-foreground)"} strokeWidth={1.2} />
        <g style={{ transformOrigin: "160px 120px", animation: running ? `cass-spin ${dur}s linear infinite` : "none" }}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M 160 120 C 170 108 184 106 192 114 C 182 124 170 126 160 120 Z"
              fill={running ? tone : "var(--muted-foreground)"}
              opacity={0.6}
              transform={`rotate(${deg} 160 120)`}
            />
          ))}
        </g>
        <circle cx={160} cy={120} r={4} fill="var(--panel-2)" stroke={running ? tone : "var(--line)"} />

        {/* discharge louvres — smooth directional streams fading outward */}
        {running &&
          streams.map((s, i) => (
            <g key={i}>
              {[-4, 0, 4].map((o, j) => (
                <path
                  key={j}
                  d={`M ${s.from[0]} ${s.from[1] + o * 0.2} Q ${(s.from[0] + s.to[0]) / 2 + o} ${(s.from[1] + s.to[1]) / 2 + o} ${s.to[0]} ${s.to[1] + o}`}
                  stroke={tone}
                  strokeWidth={j === 1 ? 1.8 : 1.1}
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    ["--stream-len" as string]: "120",
                    ["--stream-opacity" as string]: j === 1 ? 0.55 : 0.3,
                    strokeDasharray: "34 120",
                    animation: `stream-draw ${dur}s linear ${(i * 0.18 + j * 0.3).toFixed(2)}s infinite`,
                  }}
                />
              ))}
            </g>
          ))}

        <text x={160} y={214} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill={running ? tone : "var(--muted-foreground)"}>
          {running ? `${unit.mode.toUpperCase()} · FAN ${unit.fanSpeed.toUpperCase()}` : unit.comm === "offline" ? "COMMS LOST" : "UNIT OFF"}
        </text>
        <text x={160} y={234} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
          ROOM {nf(unit.roomTempC)}°C · SP {nf(unit.setpointC, 0)}°C
        </text>
      </svg>
      <style>{`@keyframes cass-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
