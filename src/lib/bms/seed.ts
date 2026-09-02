import type { Ahu, BmsState, Cassette, Meter, Panel, Site, UpsUnit, Vav } from "./types";

/** Deterministic PRNG so SSR and the first client render agree. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const CAMPUS = "R1 Technology Campus";
export const BUILDINGS = ["Tower A", "Tower B"];
export const FLOORS = ["L1", "L2", "L3", "L4", "L5", "B1"];

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function site(building: string, floor: string, zone: string, room: string): Site {
  return { campus: CAMPUS, building, floor, zone, room };
}

/** Fixed epoch keeps SSR output stable; the engine re-bases timestamps on the client. */
export const BASE_TIME = 1_756_540_800_000;

export function buildInitialState(): BmsState {
  const r = mulberry32(20260830);

  const ups: UpsUnit[] = [];
  for (let i = 1; i <= 20; i++) {
    const id = `UPS-${String(i).padStart(2, "0")}`;
    const building = BUILDINGS[i % 2 === 0 ? 1 : 0]!;
    const room = `Electrical Room ${1 + (i % 4)}`;
    const load = 28 + r() * 48;
    const capacity = [80, 120, 160, 200, 250][i % 5]!;
    const offline = i === 13;
    const bypass = i === 6;
    const battery = i === 17;
    ups.push({
      id,
      name: id,
      site: site(building, FLOORS[i % FLOORS.length]!, `Power Zone ${1 + (i % 3)}`, room),
      mode: bypass ? "bypass" : battery ? "battery" : "normal",
      comm: offline ? "offline" : "online",
      severity: offline ? "offline" : bypass ? "major" : battery ? "critical" : i === 4 ? "warning" : "normal",
      inputVoltage: round(398 + r() * 8),
      inputCurrent: round(40 + r() * 60),
      inputFrequency: round(49.9 + r() * 0.2, 2),
      outputVoltage: round(399 + r() * 3),
      outputCurrent: round(40 + r() * 60),
      outputFrequency: round(49.9 + r() * 0.2, 2),
      outputPowerKw: round((capacity * 0.9 * load) / 100),
      loadPct: round(load),
      powerFactor: round(0.93 + r() * 0.06, 2),
      batteryPct: battery ? 46 : round(92 + r() * 8),
      batteryVoltage: round(528 + r() * 20),
      batteryCurrent: round(battery ? -84 - r() * 20 : r() * 6),
      batteryTempC: round(24 + r() * 6),
      batteryHealthPct: round(86 + r() * 13),
      charging: !battery,
      runtimeMin: battery ? 21 : round(30 + r() * 40),
      capacityKva: capacity,
      lastComm: BASE_TIME,
      faults: {
        rectifier: bypass,
        battery: battery,
        inverter: bypass,
        bypass: false,
        output: false,
      },
    });
  }

  const ahus: Ahu[] = [];
  for (let i = 1; i <= 12; i++) {
    const id = `AHU-${String(i).padStart(2, "0")}`;
    const building = BUILDINGS[i > 6 ? 1 : 0]!;
    const running = i !== 11 && i !== 12;
    const setpoint = 18 + Math.round(r() * 2);
    ahus.push({
      id,
      name: id,
      site: site(building, FLOORS[i % 5]!, `AHU Zone ${1 + (i % 3)}`, `Plant Room ${1 + (i % 3)}`),
      running,
      fanRunning: running,
      fanSpeedPct: running ? round(62 + r() * 32) : 0,
      supplyTempC: running ? round(setpoint + (r() - 0.5)) : round(26 + r() * 2),
      returnTempC: round(26.5 + r() * 3),
      setpointC: setpoint,
      supplyPressurePa: running ? round(320 + r() * 120) : 0,
      filterDp: round(90 + r() * 160),
      filterPct: round(35 + r() * 55),
      damperPct: running ? round(45 + r() * 50) : 0,
      valvePct: running ? round(35 + r() * 55) : 0,
      airflowCmh: running ? round(6800 + r() * 5200) : 0,
      powerKw: running ? round(14 + r() * 16) : 0,
      comm: i === 12 ? "offline" : "online",
      severity: i === 5 ? "major" : i === 3 ? "warning" : i === 12 ? "offline" : running ? "normal" : "info",
      lastComm: BASE_TIME,
    });
  }

  const cassettes: Cassette[] = [];
  for (let i = 1; i <= 24; i++) {
    const id = `CAS-${String(i).padStart(2, "0")}`;
    const building = BUILDINGS[i > 12 ? 1 : 0]!;
    const on = i % 7 !== 0;
    cassettes.push({
      id,
      name: id,
      site: site(building, FLOORS[i % 5]!, `Zone ${1 + (i % 4)}`, `Room ${100 + i}`),
      on,
      roomTempC: round(22 + r() * 4),
      setpointC: 22 + Math.round(r()),
      mode: (["cool", "auto", "cool", "fan", "dry"] as const)[i % 5]!,
      fanSpeed: (["low", "medium", "high", "auto"] as const)[i % 4]!,
      comm: i === 19 ? "offline" : "online",
      severity: i === 19 ? "offline" : i === 8 ? "warning" : "normal",
      powerKw: on ? round(1.2 + r() * 1.6, 2) : 0,
      lastComm: BASE_TIME,
    });
  }

  const vavs: Vav[] = [];
  for (let i = 1; i <= 24; i++) {
    const id = `VAV-${String(i).padStart(2, "0")}`;
    const ahuIndex = 1 + Math.floor((i - 1) / 4);
    const ahuId = `AHU-${String(ahuIndex).padStart(2, "0")}`;
    const closed = i % 9 === 0;
    const damper = closed ? 0 : round(28 + r() * 68);
    vavs.push({
      id,
      name: id,
      ahuId,
      site: site(ahuIndex > 6 ? BUILDINGS[1]! : BUILDINGS[0]!, FLOORS[i % 5]!, `Zone ${1 + (i % 4)}`, `Room ${200 + i}`),
      damperPct: damper,
      airflowCmh: round(damper * 12 + r() * 40),
      tempC: round(22 + r() * 3),
      setpointC: 23,
      comm: i === 14 ? "offline" : "online",
      severity: i === 14 ? "offline" : i === 7 ? "warning" : "normal",
      lastComm: BASE_TIME,
    });
  }

  const meterDefs: { id: string; name: string; kind: Meter["kind"]; kw: number }[] = [
    { id: "EM-MAIN", name: "Main Incomer Meter", kind: "main", kw: 1480 },
    { id: "EM-SUB-A", name: "Sub Meter — Tower A", kind: "sub", kw: 780 },
    { id: "EM-SUB-B", name: "Sub Meter — Tower B", kind: "sub", kw: 640 },
    { id: "EM-UPS-A", name: "UPS Bus A Meter", kind: "ups", kw: 320 },
    { id: "EM-UPS-B", name: "UPS Bus B Meter", kind: "ups", kw: 280 },
    { id: "EM-AHU", name: "AHU Plant Meter", kind: "ahu", kw: 210 },
    { id: "EM-L1", name: "Floor L1 Meter", kind: "floor", kw: 140 },
    { id: "EM-L2", name: "Floor L2 Meter", kind: "floor", kw: 165 },
    { id: "EM-L3", name: "Floor L3 Meter", kind: "floor", kw: 152 },
    { id: "EM-L4", name: "Floor L4 Meter", kind: "floor", kw: 138 },
    { id: "EM-PNL-D1", name: "Distribution Panel DB-1 Meter", kind: "panel", kw: 210 },
    { id: "EM-PNL-D2", name: "Distribution Panel DB-2 Meter", kind: "panel", kw: 186 },
  ];
  const meters: Meter[] = meterDefs.map((d, i) => {
    const pf = round(0.92 + r() * 0.07, 2);
    const kva = round(d.kw / pf);
    return {
      id: d.id,
      name: d.name,
      kind: d.kind,
      site: site(BUILDINGS[i % 2]!, FLOORS[i % 5]!, "Electrical", "Metering"),
      voltage: round(399 + r() * 4),
      current: round((d.kw * 1000) / (Math.sqrt(3) * 400 * pf)),
      frequency: round(49.95 + r() * 0.1, 2),
      powerFactor: pf,
      kw: round(d.kw),
      kvar: round(Math.sqrt(Math.max(kva * kva - d.kw * d.kw, 0))),
      kva,
      kwh: round(d.kw * 1000 + r() * 5000),
      maxDemandKw: round(d.kw * 1.22),
      peakLoadKw: round(d.kw * 1.31),
      comm: "online",
      severity: "normal",
    };
  });

  const panelDefs: Omit<Panel, "site" | "voltage" | "current" | "frequency" | "powerFactor" | "severity">[] = [
    { id: "SRC-GRID", name: "Grid / Utility Supply", parentId: null, kind: "utility", kw: 1480, breakerClosed: true, energized: true, comm: "online" },
    { id: "SRC-GEN", name: "Standby Generator", parentId: null, kind: "generator", kw: 0, breakerClosed: false, energized: false, comm: "online" },
    { id: "PNL-MAIN", name: "Main Incomer Panel", parentId: "SRC-GRID", kind: "main", kw: 1480, breakerClosed: true, energized: true, comm: "online" },
    { id: "PNL-DB1", name: "Distribution Panel DB-1", parentId: "PNL-MAIN", kind: "distribution", kw: 780, breakerClosed: true, energized: true, comm: "online" },
    { id: "PNL-DB2", name: "Distribution Panel DB-2", parentId: "PNL-MAIN", kind: "distribution", kw: 640, breakerClosed: true, energized: true, comm: "online" },
    { id: "PNL-UPSA", name: "UPS Panel A", parentId: "PNL-DB1", kind: "ups", kw: 320, breakerClosed: true, energized: true, comm: "online" },
    { id: "PNL-UPSB", name: "UPS Panel B", parentId: "PNL-DB2", kind: "ups", kw: 280, breakerClosed: true, energized: true, comm: "online" },
    { id: "LOAD-CRIT-A", name: "Critical Load A", parentId: "PNL-UPSA", kind: "load", kw: 296, breakerClosed: true, energized: true, comm: "online" },
    { id: "LOAD-CRIT-B", name: "Critical Load B", parentId: "PNL-UPSB", kind: "load", kw: 254, breakerClosed: true, energized: true, comm: "online" },
    { id: "LOAD-MECH", name: "Mechanical Load (HVAC)", parentId: "PNL-DB2", kind: "load", kw: 288, breakerClosed: true, energized: true, comm: "online" },
  ];
  const panels: Panel[] = panelDefs.map((p, i) => ({
    ...p,
    site: site(BUILDINGS[i % 2]!, i < 3 ? "B1" : FLOORS[i % 5]!, "Electrical", "Switch Room"),
    voltage: p.energized ? round(399 + r() * 4) : 0,
    current: p.energized ? round((p.kw * 1000) / (Math.sqrt(3) * 400 * 0.95)) : 0,
    frequency: p.energized ? round(49.95 + r() * 0.08, 2) : 0,
    powerFactor: round(0.93 + r() * 0.05, 2),
    severity: "normal",
  }));

  return {
    tick: 0,
    now: BASE_TIME,
    link: "live",
    latencyMs: 42,
    lastUpdate: BASE_TIME,
    gateway: "online",
    ups,
    ahus,
    cassettes,
    vavs,
    meters,
    panels,
    alarms: [],
    audit: [],
    notifications: [],
    role: "Administrator",
    user: "engineer01",
  };
}
