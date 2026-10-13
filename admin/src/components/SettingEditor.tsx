import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, errorText } from "../api";
import { getIn, setIn, type Ctx, type Obj } from "./ui";

type Payload = { draft: Obj; published: Obj; publishedAt: string | null; hasUnpublishedChanges: boolean };
type Props = { settingKey: string; title: string; description: string; render: (ctx: Ctx) => ReactNode; preview: (value: Obj) => ReactNode };

export default function SettingEditor({ settingKey, title, description, render, preview }: Props) {
  const [value, setValue] = useState<Obj | null>(null);
  const [unpublished, setUnpublished] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<Payload>(`/admin/settings/${settingKey}`);
      setValue(r.draft);
      setUnpublished(r.hasUnpublishedChanges);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [settingKey]);
  useEffect(() => { setValue(null); load(); }, [load]);

  async function run(done: string, work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      await load();
      setToast({ ok: true, text: done });
    } catch (e) {
      setToast({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 4000);
    }
  }
  const saveDraft = () => api(`/admin/settings/${settingKey}`, { method: "PUT", body: { data: value } });

  if (error) return <p role="alert" className="error">{error} <button className="btn ghost" onClick={load}>Try again</button></p>;
  if (!value) return <div className="skeleton" aria-busy="true" />;

  const ctx: Ctx = { get: (p) => getIn(value, p), set: (p, v) => setValue((cur) => setIn(cur ?? {}, p, v)) };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        <span className={`badge ${unpublished ? "warn" : "ok"}`}>{unpublished ? "Unpublished changes" : "Published"}</span>
      </div>
      <div className="split">
        <section className="card form">{render(ctx)}</section>
        <section className="card" aria-label="Live preview">
          <p className="muted">Live preview (updates as you type, before saving)</p>
          {preview(value)}
        </section>
      </div>
      <div className="actions">
        <button className="btn ghost" disabled={busy} onClick={() => run("Changes discarded", () => api(`/admin/settings/${settingKey}/reset`, { method: "POST" }))}>Reset to published</button>
        <button className="btn" disabled={busy} onClick={() => run("Draft saved", saveDraft)}>Save draft</button>
        <button className="btn primary" disabled={busy} onClick={() => run("Published. The public site will show it.", async () => { await saveDraft(); await api(`/admin/settings/${settingKey}/publish`, { method: "POST" }); })}>Publish</button>
      </div>
      {toast && <div role="status" className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.text}</div>}
    </>
  );
}
