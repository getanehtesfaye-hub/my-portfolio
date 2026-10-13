import { useEffect, useState } from "react";
import { api, errorText } from "../api";
import "../content.css";
import "../more.css";

type Row = { label: string; value: number };
type Summary = {
  totals: { sessions: number; visitors: number; newVisitors: number; returning: number; pageviews: number; avgSeconds: number; bounceRate: number };
  messages: number; chatbot: number; projectViews: number;
  series: { day: string; visitors: number; sessions: number; views: number }[];
  sources: Record<string, number>; referrers: Row[]; pages: { path: string; views: number; seconds: number | null }[];
  projects: Row[]; devices: Row[]; browsers: Row[]; os: Row[]; events: Row[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const back = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const presets: Record<string, { from: string; to: string }> = {
  Today: { from: back(0), to: back(0) }, Yesterday: { from: back(1), to: back(1) },
  "Last 7 days": { from: back(6), to: back(0) }, "Last 30 days": { from: back(29), to: back(0) }, "Last 90 days": { from: back(89), to: back(0) },
};
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

function Bars({ title, rows, unit = "" }: { title: string; rows: Row[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="card">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="muted">No data in this period.</p> : (
        <ul className="bars">{rows.map((r) => <li key={r.label}><span className="bl">{r.label}</span><span className="bar"><i style={{ width: `${(r.value / max) * 100}%` }} /></span><b>{r.value}{unit}</b></li>)}</ul>
      )}
    </section>
  );
}

function Chart({ series }: { series: Summary["series"] }) {
  const W = 720, H = 200, P = 28;
  const max = Math.max(1, ...series.flatMap((s) => [s.visitors, s.views]));
  const pts = (k: "visitors" | "views") => series.map((s, i) => `${P + (series.length < 2 ? 0 : (i / (series.length - 1)) * (W - 2 * P))},${H - P - (s[k] / max) * (H - 2 * P)}`).join(" ");
  return (
    <section className="card">
      <h2>Visitors and page views</h2>
      <div className="legend"><span style={{ color: "var(--accent)" }}>● Visitors</span><span style={{ color: "var(--ok)" }}>● Page views</span><span>Peak: {max}</span></div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visitors and page views over time">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--line)" />
        <polyline points={pts("views")} fill="none" stroke="var(--ok)" strokeWidth="2" />
        <polyline points={pts("visitors")} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <text x={P} y={H - 6} fill="var(--muted)" fontSize="11">{series[0]?.day}</text>
        <text x={W - P} y={H - 6} fill="var(--muted)" fontSize="11" textAnchor="end">{series[series.length - 1]?.day}</text>
      </svg>
    </section>
  );
}

export default function Analytics() {
  const [label, setLabel] = useState("Last 7 days");
  const [range, setRange] = useState(presets["Last 7 days"]);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null); setError("");
    api<Summary>(`/admin/analytics/summary?from=${range.from}&to=${range.to}`).then(setData).catch((e) => setError(errorText(e)));
  }, [range]);

  const t = data?.totals;
  const cards: [string, string, string][] = t && data ? [
    ["Total visitors", String(t.visitors), `${t.newVisitors} new · ${t.returning} returning`], ["Page views", String(t.pageviews), `${t.sessions} sessions`],
    ["Avg. session", dur(t.avgSeconds), `Bounce rate ${(t.bounceRate * 100).toFixed(0)}%`], ["Project views", String(data.projectViews), "project pages"],
    ["Contact messages", String(data.messages), "in this period"], ["Chatbot interactions", String(data.chatbot), "opens, questions, FAQ clicks"],
  ] : [];
  const pageRows = data?.pages ?? [];

  return (
    <>
      <h1>Analytics</h1>
      <p className="muted">Anonymous and privacy-friendly: no IP addresses or cookies are stored.</p>
      <div className="range">
        {Object.keys(presets).map((p) => <button key={p} className={`chip ${label === p ? "on" : ""}`} onClick={() => { setLabel(p); setRange(presets[p]); }}>{p}</button>)}
        <input type="date" aria-label="From" value={range.from} max={range.to} onChange={(e) => { setLabel("Custom"); setRange({ ...range, from: e.target.value }); }} />
        <input type="date" aria-label="To" value={range.to} min={range.from} onChange={(e) => { setLabel("Custom"); setRange({ ...range, to: e.target.value }); }} />
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {!data && !error && <div className="skeleton" aria-busy="true" />}
      {data && (
        <>
          <div className="stats">{cards.map(([l, big, small]) => <div className="card stat" key={l}><p className="muted">{l}</p><p className="big">{big}</p><p className="muted">{small}</p></div>)}</div>
          {t?.sessions === 0 && <p className="muted">No visits in this period yet. Open your public site, click around, then come back.</p>}
          <Chart series={data.series} />
          <div className="grid2">
            <Bars title="Traffic sources" rows={Object.entries(data.sources).map(([label, value]) => ({ label, value }))} />
            <Bars title="Referrers" rows={data.referrers} />
            <Bars title="Most visited pages" rows={pageRows.slice(0, 8).map((p) => ({ label: p.path, value: p.views }))} />
            <Bars title="Least visited pages" rows={[...pageRows].reverse().slice(0, 5).map((p) => ({ label: p.path, value: p.views }))} />
            <Bars title="Time on page (seconds)" rows={pageRows.filter((p) => p.seconds !== null).slice(0, 8).map((p) => ({ label: p.path, value: Math.round(p.seconds ?? 0) }))} />
            <Bars title="Popular projects" rows={data.projects} />
            <Bars title="Devices" rows={data.devices} /><Bars title="Browsers" rows={data.browsers} />
            <Bars title="Operating systems" rows={data.os} /><Bars title="Interactions" rows={data.events} />
          </div>
        </>
      )}
    </>
  );
}
