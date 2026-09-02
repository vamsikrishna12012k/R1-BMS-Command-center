import { cn } from "@/lib/utils";
import type { UpsUnit } from "@/lib/bms/types";
import { nf } from "@/lib/bms/format";

function Node({
  x,
  y,
  w = 108,
  h = 46,
  label,
  value,
  state,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  value?: string;
  state: "active" | "idle" | "fault";
}) {
  const stroke = state === "fault" ? "var(--sev-crit)" : state === "active" ? "var(--flow)" : "var(--line)";
  const fill =
    state === "fault"
      ? "color-mix(in oklab, var(--sev-crit) 14%, transparent)"
      : state === "active"
        ? "color-mix(in oklab, var(--flow) 10%, transparent)"
        : "var(--panel-2)";
  return (
    <g className={state === "fault" ? "lamp-pulse" : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <text
        x={x + w / 2}
        y={y + (value ? 20 : h / 2 + 4)}
        textAnchor="middle"
        fontSize={12}
        fontFamily="var(--font-display)"
        letterSpacing="0.06em"
        fill={state === "idle" ? "var(--muted-foreground)" : "var(--foreground)"}
      >
        {label}
      </text>
      {value && (
        <text
          x={x + w / 2}
          y={y + 35}
          textAnchor="middle"
          fontSize={10}
          fontFamily="var(--font-mono)"
          fill={state === "fault" ? "var(--sev-crit)" : state === "active" ? "var(--flow)" : "var(--muted-foreground)"}
        >
          {value}
        </text>
      )}
    </g>
  );
}

function Link({ d, active, color = "var(--flow)", dur = 2.6 }: { d: string; active: boolean; color?: string; dur?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke="var(--line)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {active && (
        <>
          <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} />
          <path d={d} fill="none" stroke={color} strokeWidth={2.5} className="flow-dash" opacity={0.9} />
          {/* energy pulse gliding along the live path */}
          <circle r={3.2} fill={color} opacity={0.9}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          </circle>
          <circle r={7} fill={color} opacity={0.16}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          </circle>
        </>
      )}
    </>
  );
}


export function UpsPowerFlow({ ups, className }: { ups: UpsUnit; className?: string }) {
  const offline = ups.comm === "offline";
  const mode = offline ? "offline" : ups.mode;
  const utilityActive = mode === "normal" || mode === "bypass";
  const rectifierActive = mode === "normal";
  const batteryActive = mode === "battery";
  const inverterActive = mode === "normal" || mode === "battery";
  const bypassActive = mode === "bypass";
  const loadActive = !offline;

  return (
    <div className={cn("panel-surface grid-backdrop overflow-hidden", className)}>
      <svg viewBox="0 0 860 330" className="h-full w-full" role="img" aria-label={`${ups.name} power flow diagram`}>
        {/* utility → input breaker → rectifier → dc bus → inverter → load */}
        <Link d="M 128 63 H 176" active={utilityActive} />
        <Link d="M 284 63 H 332" active={rectifierActive} />
        <Link d="M 440 63 H 488" active={rectifierActive} />
        <Link d="M 596 63 H 644" active={inverterActive} />
        <Link d="M 752 63 V 150 H 640 V 250" active={loadActive} />
        {/* battery bank → dc bus */}
        <Link d="M 386 208 V 109" active={batteryActive} color="var(--copper)" />
        {/* static bypass path */}
        <Link d="M 74 109 V 268 H 300" active={bypassActive} color="var(--sev-major)" />
        <Link d="M 408 268 H 592" active={bypassActive} color="var(--sev-major)" />

        <Node x={20} y={40} label="UTILITY" value={offline ? "—" : `${nf(ups.inputVoltage, 0)} V`} state={utilityActive ? "active" : "idle"} />
        <Node x={176} y={40} label="INPUT BRK" value={utilityActive ? "CLOSED" : "OPEN"} state={utilityActive ? "active" : "idle"} />
        <Node
          x={332}
          y={40}
          label="RECTIFIER"
          value={rectifierActive ? `${nf(ups.inputCurrent, 0)} A` : "OFF"}
          state={ups.faults.rectifier ? "fault" : rectifierActive ? "active" : "idle"}
        />
        <Node x={488} y={40} label="DC BUS" value={`${nf(ups.batteryVoltage, 0)} V`} state={offline ? "idle" : "active"} />
        <Node
          x={644}
          y={40}
          label="INVERTER"
          value={inverterActive ? `${nf(ups.outputPowerKw, 0)} kW` : "OFF"}
          state={ups.faults.inverter ? "fault" : inverterActive ? "active" : "idle"}
        />

        <Node
          x={332}
          y={208}
          w={108}
          h={52}
          label="BATTERY"
          value={`${nf(ups.batteryPct, 0)}% · ${nf(ups.runtimeMin, 0)} min`}
          state={ups.faults.battery ? "fault" : batteryActive ? "active" : "idle"}
        />
        <Node x={300} y={245} w={108} h={46} label="STATIC BYPASS" value={bypassActive ? "CARRYING" : "READY"} state={ups.faults.bypass ? "fault" : bypassActive ? "active" : "idle"} />
        <Node
          x={586}
          y={245}
          w={130}
          h={46}
          label="CRITICAL LOAD"
          value={loadActive ? `${nf(ups.loadPct, 0)}% · ${nf(ups.outputPowerKw, 0)} kW` : "UNAVAILABLE"}
          state={loadActive ? "active" : "fault"}
        />

        <text x={20} y={315} fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
          MODE: {mode.toUpperCase()} · PF {nf(ups.powerFactor, 2)} · OUT {nf(ups.outputVoltage, 0)} V / {nf(ups.outputFrequency, 2)} Hz
        </text>
      </svg>
    </div>
  );
}
