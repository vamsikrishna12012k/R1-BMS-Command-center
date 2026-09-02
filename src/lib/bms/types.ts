export type Severity = "critical" | "major" | "warning" | "info" | "normal" | "offline";

export type CommStatus = "online" | "degraded" | "offline";

export interface Site {
  campus: string;
  building: string;
  floor: string;
  zone: string;
  room: string;
}

export interface UpsUnit {
  id: string;
  name: string;
  site: Site;
  mode: "normal" | "battery" | "bypass";
  comm: CommStatus;
  severity: Severity;
  inputVoltage: number;
  inputCurrent: number;
  inputFrequency: number;
  outputVoltage: number;
  outputCurrent: number;
  outputFrequency: number;
  outputPowerKw: number;
  loadPct: number;
  powerFactor: number;
  batteryPct: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryTempC: number;
  batteryHealthPct: number;
  charging: boolean;
  runtimeMin: number;
  capacityKva: number;
  lastComm: number;
  faults: { rectifier: boolean; battery: boolean; inverter: boolean; bypass: boolean; output: boolean };
}

export interface Ahu {
  id: string;
  name: string;
  site: Site;
  running: boolean;
  fanRunning: boolean;
  fanSpeedPct: number;
  supplyTempC: number;
  returnTempC: number;
  setpointC: number;
  supplyPressurePa: number;
  filterDp: number;
  filterPct: number;
  damperPct: number;
  valvePct: number;
  airflowCmh: number;
  powerKw: number;
  comm: CommStatus;
  severity: Severity;
  lastComm: number;
}

export interface Cassette {
  id: string;
  name: string;
  site: Site;
  on: boolean;
  roomTempC: number;
  setpointC: number;
  mode: "cool" | "fan" | "auto" | "dry";
  fanSpeed: "low" | "medium" | "high" | "auto";
  comm: CommStatus;
  severity: Severity;
  powerKw: number;
  lastComm: number;
}

export interface Vav {
  id: string;
  name: string;
  ahuId: string;
  site: Site;
  damperPct: number;
  airflowCmh: number;
  tempC: number;
  setpointC: number;
  comm: CommStatus;
  severity: Severity;
  lastComm: number;
}

export interface Meter {
  id: string;
  name: string;
  kind: "main" | "sub" | "ups" | "ahu" | "floor" | "panel";
  site: Site;
  voltage: number;
  current: number;
  frequency: number;
  powerFactor: number;
  kw: number;
  kvar: number;
  kva: number;
  kwh: number;
  maxDemandKw: number;
  peakLoadKw: number;
  comm: CommStatus;
  severity: Severity;
}

export interface Panel {
  id: string;
  name: string;
  parentId: string | null;
  kind: "utility" | "generator" | "main" | "distribution" | "ups" | "load";
  site: Site;
  voltage: number;
  current: number;
  kw: number;
  powerFactor: number;
  frequency: number;
  breakerClosed: boolean;
  energized: boolean;
  comm: CommStatus;
  severity: Severity;
}

export type AlarmState = "new" | "active" | "acknowledged" | "investigating" | "resolved" | "closed";

export interface Alarm {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  building: string;
  floor: string;
  raisedAt: number;
  clearedAt: number | null;
  description: string;
  severity: Exclude<Severity, "normal" | "offline"> | "offline";
  state: AlarmState;
  comments: { at: number; user: string; text: string }[];
}

export interface AuditEntry {
  id: string;
  at: number;
  user: string;
  role: Role;
  equipment: string;
  action: string;
  previous: string;
  next: string;
  status: "Successful" | "Denied";
}

export interface Notification {
  id: string;
  at: number;
  kind: "critical" | "warning" | "offline" | "recovery" | "info";
  title: string;
  detail: string;
  read: boolean;
}

export type Role = "Administrator" | "BMS Manager" | "Engineer" | "Operator" | "Viewer";

export interface BmsState {
  tick: number;
  now: number;
  link: "live" | "reconnecting" | "disconnected";
  latencyMs: number;
  lastUpdate: number;
  gateway: CommStatus;
  ups: UpsUnit[];
  ahus: Ahu[];
  cassettes: Cassette[];
  vavs: Vav[];
  meters: Meter[];
  panels: Panel[];
  alarms: Alarm[];
  audit: AuditEntry[];
  notifications: Notification[];
  role: Role;
  user: string;
}
