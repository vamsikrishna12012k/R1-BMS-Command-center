export const nf = (v: number, d = 1) =>
  v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const int = (v: number) => Math.round(v).toLocaleString("en-US");

export function clockTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
}

export function stamp(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function since(ts: number, now: number) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  if (h < 24) return `${h}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
