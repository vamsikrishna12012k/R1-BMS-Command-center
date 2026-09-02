import { buildInitialState, hashString } from "./seed";
import type {
  Alarm,
  AuditEntry,
  BmsState,
  Notification,
  Role,
  Severity,
} from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  offline: 4,
  major: 3,
  warning: 2,
  info: 1,
  normal: 0,
};

export const ROLE_RANK: Record<Role, number> = {
  Administrator: 5,
  "BMS Manager": 4,
  Engineer: 3,
  Operator: 2,
  Viewer: 1,
};

export function canControl(role: Role, level: "basic" | "critical" = "basic") {
  return level === "critical" ? ROLE_RANK[role] >= 3 : ROLE_RANK[role] >= 2;
}

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const ALARM_TEXT: Record<string, string> = {
  critical: "Critical condition detected",
  major: "Major fault detected",
  warning: "Parameter outside normal range",
  offline: "Communication lost with device",
};

class BmsEngine {
  state: BmsState = buildInitialState();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private prevSeverity = new Map<string, Severity>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.state;

  private emit() {
    this.state = { ...this.state };
    for (const l of this.listeners) l();
  }

  private commit(mutate: (s: BmsState) => void) {
    mutate(this.state);
    this.emit();
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    // Re-base the deterministic seed timestamps onto the real clock.
    const now = Date.now();
    const s = this.state;
    s.now = now;
    s.lastUpdate = now;
    for (const u of s.ups) u.lastComm = u.comm === "offline" ? now - 184_000 : now;
    for (const a of s.ahus) a.lastComm = a.comm === "offline" ? now - 240_000 : now;
    for (const c of s.cassettes) c.lastComm = c.comm === "offline" ? now - 320_000 : now;
    for (const v of s.vavs) v.lastComm = v.comm === "offline" ? now - 140_000 : now;
    this.seedAlarms();
    this.tick();
    this.timer = setInterval(() => this.tick(), 2000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
  }

  /* ---------------- alarms ---------------- */

  private seedAlarms() {
    const s = this.state;
    const seeded: { id: string; name: string; type: string; sev: Severity; text: string; site: { building: string; floor: string }; ageMin: number }[] = [];
    for (const u of s.ups) {
      this.prevSeverity.set(u.id, u.severity);
      if (u.severity !== "normal")
        seeded.push({
          id: u.id,
          name: u.name,
          type: "UPS",
          sev: u.severity,
          text:
            u.mode === "battery"
              ? "On battery — utility input loss"
              : u.mode === "bypass"
                ? "Inverter fault — transferred to static bypass"
                : u.comm === "offline"
                  ? "Communication lost with UPS controller"
                  : "Output load above 75% threshold",
          site: u.site,
          ageMin: 4 + (hashString(u.id) % 90),
        });
    }
    for (const a of s.ahus) {
      this.prevSeverity.set(a.id, a.severity);
      if (a.severity !== "normal" && a.severity !== "info")
        seeded.push({
          id: a.id,
          name: a.name,
          type: "AHU",
          sev: a.severity,
          text: a.comm === "offline" ? "Communication lost with AHU controller" : a.severity === "major" ? "Supply air temperature deviation" : "Filter differential pressure high",
          site: a.site,
          ageMin: 6 + (hashString(a.id) % 120),
        });
    }
    for (const c of s.cassettes) {
      this.prevSeverity.set(c.id, c.severity);
      if (c.severity !== "normal")
        seeded.push({
          id: c.id,
          name: c.name,
          type: "Cassette AC",
          sev: c.severity,
          text: c.comm === "offline" ? "Communication lost with indoor unit" : "Room temperature above setpoint band",
          site: c.site,
          ageMin: 11 + (hashString(c.id) % 60),
        });
    }
    for (const v of s.vavs) {
      this.prevSeverity.set(v.id, v.severity);
      if (v.severity !== "normal")
        seeded.push({
          id: v.id,
          name: v.name,
          type: "VAV",
          sev: v.severity,
          text: v.comm === "offline" ? "Communication timeout on VAV controller" : "Damper not tracking commanded position",
          site: v.site,
          ageMin: 3 + (hashString(v.id) % 45),
        });
    }
    const now = Date.now();
    s.alarms = seeded.map((x) => ({
      id: uid("ALM"),
      equipmentId: x.id,
      equipmentName: x.name,
      equipmentType: x.type,
      building: x.site.building,
      floor: x.site.floor,
      raisedAt: now - x.ageMin * 60_000,
      clearedAt: null,
      description: x.text,
      severity: x.sev as Alarm["severity"],
      state: "active",
      comments: [],
    }));
  }

  private raise(equipmentId: string, name: string, type: string, sev: Severity, building: string, floor: string, description?: string) {
    if (sev === "normal" || sev === "info") return;
    const s = this.state;
    const existing = s.alarms.find((a) => a.equipmentId === equipmentId && a.clearedAt === null);
    if (existing) {
      existing.severity = sev as Alarm["severity"];
      return;
    }
    const alarm: Alarm = {
      id: uid("ALM"),
      equipmentId,
      equipmentName: name,
      equipmentType: type,
      building,
      floor,
      raisedAt: Date.now(),
      clearedAt: null,
      description: description ?? ALARM_TEXT[sev] ?? "Abnormal condition",
      severity: sev as Alarm["severity"],
      state: "new",
      comments: [],
    };
    s.alarms = [alarm, ...s.alarms];
    this.notify({
      kind: sev === "critical" ? "critical" : sev === "offline" ? "offline" : "warning",
      title: `${name} — ${sev.toUpperCase()}`,
      detail: alarm.description,
    });
  }

  private clear(equipmentId: string, name: string) {
    const s = this.state;
    const open = s.alarms.filter((a) => a.equipmentId === equipmentId && a.clearedAt === null);
    if (!open.length) return;
    for (const a of open) {
      a.clearedAt = Date.now();
      a.state = "resolved";
    }
    this.notify({ kind: "recovery", title: `${name} — recovered`, detail: "Condition returned to normal" });
  }

  notify(n: Omit<Notification, "id" | "at" | "read">) {
    const s = this.state;
    s.notifications = [{ ...n, id: uid("NTF"), at: Date.now(), read: false }, ...s.notifications].slice(0, 60);
  }

  private audit(entry: Omit<AuditEntry, "id" | "at" | "user" | "role">) {
    const s = this.state;
    s.audit = [{ ...entry, id: uid("AUD"), at: Date.now(), user: s.user, role: s.role }, ...s.audit].slice(0, 300);
  }

  /* ---------------- simulation ---------------- */

  private tick() {
    const s = this.state;
    const t = s.tick + 1;
    const now = Date.now();
    s.tick = t;
    s.now = now;
    s.lastUpdate = now;
    s.latencyMs = Math.round(28 + Math.abs(Math.sin(t / 7)) * 46);
    const wave = (offset: number, period: number) => Math.sin((t + offset) / period);

    for (const u of s.ups) {
      if (u.comm === "offline") continue;
      const k = hashString(u.id) % 100;
      u.lastComm = now;
      const drift = wave(k, 9) * 2.4 + (Math.random() - 0.5) * 1.2;
      u.loadPct = round(clamp(u.loadPct + drift * 0.4, 12, 96));
      u.outputPowerKw = round((u.capacityKva * 0.9 * u.loadPct) / 100);
      u.inputVoltage = round(clamp(400 + wave(k, 11) * 4 + (Math.random() - 0.5), 372, 424));
      u.outputVoltage = round(clamp(400 + wave(k, 13) * 1.6, 392, 408));
      u.inputCurrent = round((u.outputPowerKw * 1000) / (Math.sqrt(3) * u.inputVoltage * 0.98));
      u.outputCurrent = round((u.outputPowerKw * 1000) / (Math.sqrt(3) * u.outputVoltage * u.powerFactor));
      u.inputFrequency = round(50 + wave(k, 17) * 0.06, 2);
      u.outputFrequency = round(50 + wave(k + 3, 19) * 0.03, 2);
      u.batteryTempC = round(clamp(u.batteryTempC + (Math.random() - 0.5) * 0.15, 21, 41));
      if (u.mode === "battery") {
        u.batteryPct = round(clamp(u.batteryPct - 0.09, 0, 100));
        u.batteryCurrent = round(-(u.outputPowerKw * 1000) / u.batteryVoltage);
        u.charging = false;
        u.runtimeMin = round((u.batteryPct / 100) * 46 * (50 / Math.max(u.loadPct, 10)));
        u.inputVoltage = 0;
      } else {
        u.batteryPct = round(clamp(u.batteryPct + 0.12, 0, 100));
        u.batteryCurrent = round(u.batteryPct >= 100 ? 0.4 : 6 + Math.random() * 2);
        u.charging = u.batteryPct < 100;
        u.runtimeMin = round((u.batteryPct / 100) * 46 * (50 / Math.max(u.loadPct, 10)));
      }
      u.batteryVoltage = round(clamp(482 + (u.batteryPct / 100) * 62, 400, 552));

      const sev: Severity =
        u.mode === "battery" && u.batteryPct < 55
          ? "critical"
          : u.mode === "bypass"
            ? "major"
            : u.loadPct > 88 || u.batteryTempC > 38
              ? "warning"
              : "normal";
      this.applySeverity(u.id, u.name, "UPS", sev, u.site.building, u.site.floor, u.severity !== sev ? this.upsText(u, sev) : undefined);
      u.severity = sev === "normal" ? "normal" : sev;
    }

    for (const a of s.ahus) {
      if (a.comm === "offline") continue;
      a.lastComm = now;
      const k = hashString(a.id) % 100;
      if (a.running) {
        a.fanRunning = true;
        a.fanSpeedPct = round(clamp(a.fanSpeedPct + wave(k, 8) * 0.9, 35, 100));
        a.returnTempC = round(clamp(26.8 + wave(k + 5, 15) * 1.5 + (Math.random() - 0.5) * 0.2, 22, 32));
        const err = a.supplyTempC - a.setpointC;
        a.valvePct = round(clamp(a.valvePct + err * 3.5 + (Math.random() - 0.5), 0, 100));
        a.supplyTempC = round(clamp(a.supplyTempC - err * 0.25 + (Math.random() - 0.5) * 0.12, 10, 30), 2);
        a.damperPct = round(clamp(a.damperPct + wave(k + 2, 12) * 1.1, 20, 100));
        a.airflowCmh = round(120 * a.fanSpeedPct * (a.damperPct / 100) + 800);
        a.supplyPressurePa = round(120 + a.fanSpeedPct * 3.4);
        a.powerKw = round(6 + (a.fanSpeedPct / 100) ** 2.6 * 26, 2);
        a.filterDp = round(clamp(a.filterDp + 0.02, 60, 340));
        a.filterPct = round(clamp((a.filterDp / 340) * 100, 0, 100));
      } else {
        a.fanRunning = false;
        a.fanSpeedPct = 0;
        a.airflowCmh = 0;
        a.powerKw = 0;
        a.supplyPressurePa = 0;
        a.damperPct = 0;
        a.supplyTempC = round(clamp(a.supplyTempC + 0.05, 10, 28), 2);
      }
      const sev: Severity = !a.running
        ? "info"
        : a.filterDp > 300
          ? "warning"
          : Math.abs(a.supplyTempC - a.setpointC) > 2.5
            ? "major"
            : "normal";
      this.applySeverity(a.id, a.name, "AHU", sev, a.site.building, a.site.floor, sev === "warning" ? "Filter differential pressure high" : "Supply air temperature deviation");
      a.severity = sev;
    }

    for (const c of s.cassettes) {
      if (c.comm === "offline") continue;
      c.lastComm = now;
      const k = hashString(c.id) % 100;
      if (c.on && c.mode !== "fan") {
        c.roomTempC = round(clamp(c.roomTempC + (c.setpointC - c.roomTempC) * 0.08 + (Math.random() - 0.5) * 0.06, 16, 32), 2);
        c.powerKw = round(0.8 + Math.abs(c.setpointC - c.roomTempC) * 0.6 + (c.fanSpeed === "high" ? 0.6 : 0.2), 2);
      } else if (c.on) {
        c.roomTempC = round(clamp(c.roomTempC + 0.02 * Math.sign(26 - c.roomTempC) + wave(k, 20) * 0.02, 16, 32), 2);
        c.powerKw = 0.4;
      } else {
        c.roomTempC = round(clamp(c.roomTempC + 0.03, 16, 33), 2);
        c.powerKw = 0;
      }
      const sev: Severity = c.on && c.roomTempC - c.setpointC > 3 ? "warning" : "normal";
      this.applySeverity(c.id, c.name, "Cassette AC", sev, c.site.building, c.site.floor, "Room temperature above setpoint band");
      c.severity = sev;
    }

    for (const v of s.vavs) {
      if (v.comm === "offline") continue;
      v.lastComm = now;
      const k = hashString(v.id) % 100;
      const parent = s.ahus.find((a) => a.id === v.ahuId);
      const ahuRunning = parent?.running && parent.comm !== "offline";
      if (!ahuRunning) {
        v.airflowCmh = 0;
      } else if (v.damperPct > 0) {
        const err = v.tempC - v.setpointC;
        v.damperPct = round(clamp(v.damperPct + err * 4 + wave(k, 10) * 1.4, 5, 100));
        v.airflowCmh = round(v.damperPct * 11 + wave(k + 4, 9) * 12);
      } else {
        v.airflowCmh = 0;
      }
      v.tempC = round(clamp(v.tempC + (ahuRunning ? -0.02 * (v.damperPct / 60) : 0.03) + (Math.random() - 0.5) * 0.05, 17, 31), 2);
      const sev: Severity = v.damperPct > 0 && v.airflowCmh < 30 ? "warning" : "normal";
      this.applySeverity(v.id, v.name, "VAV", sev, v.site.building, v.site.floor, "Airflow below minimum for commanded damper position");
      v.severity = sev;
    }

    const hvacKw = s.ahus.reduce((n, a) => n + a.powerKw, 0) + s.cassettes.reduce((n, c) => n + c.powerKw, 0);
    const upsKw = s.ups.reduce((n, u) => n + (u.comm === "offline" ? 0 : u.outputPowerKw), 0);
    for (const m of s.meters) {
      const base = m.kind === "main" ? upsKw + hvacKw + 620 : m.kind === "ups" ? upsKw / 2 : m.kind === "ahu" ? hvacKw : m.kw;
      const k = hashString(m.id) % 100;
      m.kw = round(base * (1 + wave(k, 14) * 0.02));
      m.voltage = round(400 + wave(k + 1, 16) * 2.4);
      m.frequency = round(50 + wave(k + 2, 21) * 0.04, 2);
      m.powerFactor = round(clamp(0.95 + wave(k + 3, 18) * 0.03, 0.8, 1), 3);
      m.kva = round(m.kw / m.powerFactor);
      m.kvar = round(Math.sqrt(Math.max(m.kva ** 2 - m.kw ** 2, 0)));
      m.current = round((m.kw * 1000) / (Math.sqrt(3) * m.voltage * m.powerFactor));
      m.kwh = round(m.kwh + (m.kw * 2) / 3600, 2);
      m.maxDemandKw = round(Math.max(m.maxDemandKw, m.kw));
      m.peakLoadKw = round(Math.max(m.peakLoadKw, m.kw));
    }

    // Electrical topology: energization follows breaker states down the tree.
    const byId = new Map(s.panels.map((p) => [p.id, p]));
    for (const p of s.panels) {
      const parent = p.parentId ? byId.get(p.parentId) : null;
      const sourceLive = p.parentId ? Boolean(parent?.energized && parent.breakerClosed) : p.kind === "utility" ? true : p.breakerClosed;
      p.energized = sourceLive && p.breakerClosed;
      const share =
        p.kind === "utility" || p.kind === "main"
          ? s.meters[0]!.kw
          : p.kind === "distribution"
            ? s.meters[0]!.kw * 0.5
            : p.kind === "ups"
              ? upsKw / 2
              : p.kind === "generator"
                ? 0
                : upsKw / 2.2;
      p.kw = p.energized ? round(share) : 0;
      p.voltage = p.energized ? round(400 + wave(hashString(p.id) % 40, 16) * 2) : 0;
      p.current = p.energized ? round((p.kw * 1000) / (Math.sqrt(3) * 400 * p.powerFactor)) : 0;
      p.frequency = p.energized ? round(50 + wave(hashString(p.id) % 30, 22) * 0.03, 2) : 0;
      p.severity = p.energized ? "normal" : p.breakerClosed ? "major" : "info";
    }

    this.emit();
  }

  private upsText(u: { mode: string; batteryPct: number; loadPct: number }, sev: Severity) {
    if (sev === "critical") return `On battery — ${Math.round(u.batteryPct)}% remaining`;
    if (sev === "major") return "Inverter fault — transferred to static bypass";
    if (sev === "warning") return u.loadPct > 88 ? "Output load above 88% threshold" : "Battery temperature high";
    return "Condition normal";
  }

  private applySeverity(id: string, name: string, type: string, sev: Severity, building: string, floor: string, text?: string) {
    const prev = this.prevSeverity.get(id) ?? "normal";
    if (SEVERITY_RANK[sev] === SEVERITY_RANK[prev]) return;
    this.prevSeverity.set(id, sev);
    if (sev === "normal" || sev === "info") this.clear(id, name);
    else this.raise(id, name, type, sev, building, floor, text);
  }

  /* ---------------- commands ---------------- */

  setRole(role: Role) {
    this.commit((s) => {
      s.role = role;
    });
  }

  setUpsMode(id: string, mode: "normal" | "battery" | "bypass") {
    this.commit((s) => {
      const u = s.ups.find((x) => x.id === id);
      if (!u) return;
      this.audit({ equipment: u.name, action: "UPS operating mode changed", previous: u.mode, next: mode, status: "Successful" });
      u.mode = mode;
      u.faults.inverter = mode === "bypass";
      u.faults.rectifier = mode === "bypass";
    });
  }

  setAhuRunning(id: string, running: boolean) {
    this.commit((s) => {
      const a = s.ahus.find((x) => x.id === id);
      if (!a) return;
      this.audit({ equipment: a.name, action: running ? "AHU started" : "AHU stopped", previous: a.running ? "RUNNING" : "STOPPED", next: running ? "RUNNING" : "STOPPED", status: "Successful" });
      a.running = running;
    });
  }

  setAhuSetpoint(id: string, value: number) {
    this.commit((s) => {
      const a = s.ahus.find((x) => x.id === id);
      if (!a) return;
      this.audit({ equipment: a.name, action: "Supply air setpoint changed", previous: `${a.setpointC}°C`, next: `${value}°C`, status: "Successful" });
      a.setpointC = value;
    });
  }

  setAhuDamper(id: string, value: number) {
    this.commit((s) => {
      const a = s.ahus.find((x) => x.id === id);
      if (!a) return;
      this.audit({ equipment: a.name, action: "Damper position commanded", previous: `${a.damperPct}%`, next: `${value}%`, status: "Successful" });
      a.damperPct = value;
    });
  }

  setCassette(id: string, patch: Partial<{ on: boolean; setpointC: number; mode: "cool" | "fan" | "auto" | "dry"; fanSpeed: "low" | "medium" | "high" | "auto" }>) {
    this.commit((s) => {
      const c = s.cassettes.find((x) => x.id === id);
      if (!c) return;
      for (const [key, value] of Object.entries(patch)) {
        const prev = (c as unknown as Record<string, unknown>)[key];
        this.audit({
          equipment: c.name,
          action: `Cassette ${key} changed`,
          previous: String(prev),
          next: String(value),
          status: "Successful",
        });
      }
      Object.assign(c, patch);
    });
  }

  setVavDamper(id: string, value: number) {
    this.commit((s) => {
      const v = s.vavs.find((x) => x.id === id);
      if (!v) return;
      this.audit({ equipment: v.name, action: "VAV damper commanded", previous: `${v.damperPct}%`, next: `${value}%`, status: "Successful" });
      v.damperPct = value;
    });
  }

  setBreaker(id: string, closed: boolean) {
    this.commit((s) => {
      const p = s.panels.find((x) => x.id === id);
      if (!p) return;
      this.audit({ equipment: p.name, action: closed ? "Breaker closed" : "Breaker opened", previous: p.breakerClosed ? "CLOSED" : "OPEN", next: closed ? "CLOSED" : "OPEN", status: "Successful" });
      p.breakerClosed = closed;
    });
  }

  denied(equipment: string, action: string) {
    this.commit(() => {
      this.audit({ equipment, action, previous: "-", next: "-", status: "Denied" });
    });
  }

  setAlarmState(id: string, state: Alarm["state"]) {
    this.commit((s) => {
      const a = s.alarms.find((x) => x.id === id);
      if (!a) return;
      this.audit({ equipment: a.equipmentName, action: `Alarm ${state}`, previous: a.state, next: state, status: "Successful" });
      a.state = state;
      if (state === "closed" && !a.clearedAt) a.clearedAt = Date.now();
    });
  }

  addAlarmComment(id: string, text: string) {
    this.commit((s) => {
      const a = s.alarms.find((x) => x.id === id);
      if (!a) return;
      a.comments = [...a.comments, { at: Date.now(), user: s.user, text }];
    });
  }

  markNotificationsRead() {
    this.commit((s) => {
      s.notifications = s.notifications.map((n) => ({ ...n, read: true }));
    });
  }
}

let engine: BmsEngine | null = null;
export function getEngine() {
  if (!engine) engine = new BmsEngine();
  return engine;
}
