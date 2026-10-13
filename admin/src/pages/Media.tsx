import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { api, errorText } from "../api";
import "../content.css";
import "../more.css";

type Asset = { id: string; file_name: string; url: string; mime_type: string; size_bytes: string; created_at: string };
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function Media() {
  const [rows, setRows] = useState<Asset[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    try { setRows((await api<{ data: Asset[] }>(`/admin/media?q=${encodeURIComponent(q)}`)).data); setError(""); } catch (e) { setError(errorText(e)); }
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setBusy(true);
    for (const f of files) {
      if (f.size > 25 * 1048576) { say(false, `${f.name} is larger than 25 MB`); continue; }
      try {
        const res = await fetch(`${BASE}/admin/media/upload?name=${encodeURIComponent(f.name)}`, {
          method: "PUT", credentials: "include", headers: { "Content-Type": f.type || "application/octet-stream", "X-Requested-With": "portfolio-admin" }, body: f,
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Upload failed");
        say(true, `${f.name} uploaded`);
      } catch (err) { say(false, errorText(err)); }
    }
    setBusy(false);
    load();
  }
  const copy = (url: string) => navigator.clipboard.writeText(url).then(() => say(true, "Link copied. Paste it into any image or video field."), () => say(false, "Could not copy. Select the link manually."));
  const remove = async (a: Asset) => {
    if (!confirm(`Delete ${a.file_name}? Pages using it will show a broken image.`)) return;
    try { await api(`/admin/media/${a.id}`, { method: "DELETE" }); say(true, "Deleted"); load(); } catch (e) { say(false, errorText(e)); }
  };

  return (
    <>
      <div className="pagehead"><div><h1>Media library</h1><p className="muted">PNG, JPG, GIF, WebP, MP4 and WebM up to 25 MB.</p></div></div>
      <div className="toolbar">
        <input aria-label="Search files" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="btn primary">{busy ? "Uploading…" : "Upload files"}<input type="file" multiple hidden disabled={busy} accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" onChange={upload} /></label>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {!rows && !error && <div className="skeleton" aria-busy="true" />}
      {rows?.length === 0 && <div className="card"><p className="muted">{q ? "No files match your search." : "No files yet. Upload your first image or video."}</p></div>}
      <div className="media">
        {rows?.map((a) => (
          <figure className="card" key={a.id}>
            {a.mime_type.startsWith("video") ? <video src={a.url} controls preload="metadata" /> : <img src={a.url} alt={a.file_name} loading="lazy" />}
            <figcaption><strong>{a.file_name}</strong><br /><span className="muted">{a.mime_type} · {size(Number(a.size_bytes))} · {new Date(a.created_at).toLocaleDateString()}</span></figcaption>
            <div className="tools" style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => copy(a.url)}>Copy URL</button>
              <button className="btn ghost danger" onClick={() => remove(a)}>Delete</button>
            </div>
          </figure>
        ))}
      </div>
      {toast && <div role="status" className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.text}</div>}
    </>
  );
}
