import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, errorText } from "../api";
import "../content.css";

export type Row = Record<string, unknown>;
export type FieldDef = {
  key: string; label: string; type: "text" | "textarea" | "number" | "checkbox" | "select" | "list" | "date";
  required?: boolean; link?: boolean; hint?: string; options?: string[]; relation?: { path: string; label: string };
};
export type Toggle = { key: string; label: string; on?: unknown; off?: unknown };
export type Config = {
  path: string; title: string; description: string; singular: string; titleKey: string;
  subtitle?: (r: Row) => string; fields: FieldDef[]; toggles?: Toggle[];
  duplicate?: (r: Row) => Row; related?: { to: string; label: string }; defaults?: Row;
};
type Option = { value: string; label: string };

const localDate = (v: unknown) => {
  if (typeof v !== "string") return "";
  const d = new Date(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const initForm = (fields: FieldDef[], row: Row | null, defaults: Row = {}): Row =>
  Object.fromEntries(fields.map((f) => {
    const v = row ? row[f.key] : defaults[f.key];
    if (f.type === "list") return [f.key, Array.isArray(v) ? v.join(", ") : ""];
    if (f.type === "checkbox") return [f.key, Boolean(v)];
    if (f.type === "number") return [f.key, v ?? 0];
    if (f.type === "date") return [f.key, localDate(v)];
    return [f.key, v ?? ""];
  }));
const toPayload = (fields: FieldDef[], f: Row): Row =>
  Object.fromEntries(fields.map((d) => {
    const v = f[d.key];
    switch (d.type) {
      case "number": return [d.key, Number(v)];
      case "checkbox": return [d.key, Boolean(v)];
      case "list": return [d.key, String(v).split(/[,\n]/).map((s) => s.trim()).filter(Boolean)];
      case "date": return [d.key, v ? String(v) : null];
      case "select": return [d.key, d.relation ? v || null : v];
      default: { const s = String(v).trim(); return [d.key, d.link ? s || null : s]; }
    }
  }));

export default function ResourceManager({ cfg }: { cfg: Config }) {
  const base = `/admin/${cfg.path}`;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ row: Row | null } | null>(null);
  const [form, setForm] = useState<Row>({});
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const notify = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3500); };
  const load = useCallback(async () => {
    try { setRows((await api<{ data: Row[] }>(base)).data); setError(""); } catch (e) { setError(errorText(e)); }
  }, [base]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    cfg.fields.forEach(async (f) => {
      if (!f.relation) return;
      const rel = f.relation;
      try {
        const r = await api<{ data: Row[] }>(`/admin/${rel.path}`);
        setOptions((o) => ({ ...o, [f.key]: r.data.map((x) => ({ value: String(x.id), label: String(x[rel.label]) })) }));
      } catch { /* the select simply stays empty */ }
    });
  }, [cfg]);

  async function act(done: string, work: () => Promise<unknown>) {
    try { await work(); await load(); notify(true, done); } catch (e) { notify(false, errorText(e)); }
  }
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const open = (row: Row | null) => { setForm(initForm(cfg.fields, row, cfg.defaults)); setFormError(""); setEditing({ row }); };
  const move = (i: number, d: number) => {
    const list = [...(rows ?? [])];
    [list[i], list[i + d]] = [list[i + d], list[i]];
    setRows(list);
    return act("Order saved", () => api(`${base}/reorder`, { method: "PUT", body: { ids: list.map((r) => r.id) } }));
  };
  const flip = (r: Row, t: Toggle) => {
    const on = t.on === undefined ? Boolean(r[t.key]) : r[t.key] === t.on;
    const next = t.on === undefined ? !on : on ? t.off : t.on;
    return act("Updated", () => api(`${base}/${r.id}`, { method: "PUT", body: { [t.key]: next } }));
  };
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setFormError("");
    try {
      const body = toPayload(cfg.fields, form);
      if (editing?.row) await api(`${base}/${editing.row.id}`, { method: "PUT", body });
      else await api(base, { method: "POST", body });
      setEditing(null); await load(); notify(true, "Saved");
    } catch (err) { setFormError(errorText(err)); } finally { setSaving(false); }
  }

  const q = query.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => !q || `${r[cfg.titleKey]} ${cfg.subtitle?.(r) ?? ""}`.toLowerCase().includes(q));

  return (
    <>
      <div className="pagehead"><div><h1>{cfg.title}</h1><p className="muted">{cfg.description}</p></div></div>
      <div className="toolbar">
        <input aria-label={`Search ${cfg.title}`} placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {cfg.related && <Link className="btn ghost" to={cfg.related.to}>{cfg.related.label}</Link>}
        <button className="btn primary" onClick={() => open(null)}>Add {cfg.singular}</button>
      </div>

      {error && <p role="alert" className="error">{error} <button className="btn ghost" onClick={load}>Try again</button></p>}
      {!error && !rows && <div className="skeleton" aria-busy="true" />}
      {rows && rows.length === 0 && <div className="card"><p className="muted">No {cfg.singular}s yet.</p><button className="btn primary" onClick={() => open(null)}>Add your first {cfg.singular}</button></div>}
      {rows && rows.length > 0 && shown.length === 0 && <p className="muted">Nothing matches your search.</p>}

      <ul className="rows">
        {shown.map((r, i) => (
          <li className="row card" key={String(r.id)}>
            <div className="rowmain"><strong>{String(r[cfg.titleKey])}</strong><span className="muted">{cfg.subtitle?.(r)}</span></div>
            {cfg.toggles?.map((t) => {
              const on = t.on === undefined ? Boolean(r[t.key]) : r[t.key] === t.on;
              return <button key={t.key} className={`chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => flip(r, t)}>{t.label}</button>;
            })}
            <span className="tools">
              <button className="btn ghost" aria-label="Move up" disabled={!!q || i === 0} onClick={() => move(i, -1)}>↑</button>
              <button className="btn ghost" aria-label="Move down" disabled={!!q || i === shown.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button className="btn" onClick={() => open(r)}>Edit</button>
              {cfg.duplicate && <button className="btn ghost" onClick={() => act("Duplicated as a draft", () => api(base, { method: "POST", body: toPayload(cfg.fields, initForm(cfg.fields, cfg.duplicate!(r))) }))}>Duplicate</button>}
              <button className="btn ghost danger" onClick={() => confirm(`Delete this ${cfg.singular}? This cannot be undone.`) && act("Deleted", () => api(`${base}/${r.id}`, { method: "DELETE" }))}>Delete</button>
            </span>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <form className="drawer" role="dialog" aria-modal="true" aria-label={`${editing.row ? "Edit" : "Add"} ${cfg.singular}`}
            onClick={(e) => e.stopPropagation()} onSubmit={save} onKeyDown={(e) => e.key === "Escape" && setEditing(null)}>
            <h2>{editing.row ? "Edit" : "Add"} {cfg.singular}</h2>
            {cfg.fields.map((f) => f.type === "checkbox" ? (
              <label className="check" key={f.key}><input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => set(f.key, e.target.checked)} />{f.label}</label>
            ) : (
              <label className="field" key={f.key}>
                <span>{f.label}{f.required && " *"}</span>
                {f.type === "textarea" || f.type === "list" ? <textarea rows={f.type === "list" ? 2 : 4} required={f.required} value={String(form[f.key])} onChange={(e) => set(f.key, e.target.value)} />
                  : f.type === "select" ? (
                    <select value={String(form[f.key])} onChange={(e) => set(f.key, e.target.value)}>
                      {f.relation ? <><option value="">None</option>{(options[f.key] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</> : f.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : <input type={f.type} required={f.required} value={String(form[f.key])} onChange={(e) => set(f.key, e.target.value)} />}
                {(f.hint || f.type === "list") && <small className="muted">{f.hint ?? "Separate items with commas"}</small>}
              </label>
            ))}
            {formError && <p role="alert" className="error">{formError}</p>}
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div role="status" className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.text}</div>}
    </>
  );
}
