import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "../api";
import "../content.css";

type Msg = { id: string; name: string; email: string; subject: string | null; message: string; status: string; created_at: string };
const statuses = ["new", "read", "replied", "archived"];

export default function Messages() {
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<Msg[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRows((await api<{ data: Msg[] }>(`/admin/contact-messages${filter === "all" ? "" : `?status=${filter}`}`)).data);
      setError("");
    } catch (e) { setError(errorText(e)); }
  }, [filter]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const run = async (work: () => Promise<unknown>) => { try { await work(); await load(); } catch (e) { setError(errorText(e)); } };

  return (
    <>
      <h1>Contact messages</h1>
      <div className="tabs" role="tablist">
        {["all", ...statuses].map((s) => <button key={s} role="tab" aria-selected={filter === s} className={`chip ${filter === s ? "on" : ""}`} onClick={() => setFilter(s)}>{s}</button>)}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {!rows && !error && <div className="skeleton" aria-busy="true" />}
      {rows?.length === 0 && <p className="muted">No {filter === "all" ? "" : filter} messages.</p>}
      {rows?.map((m) => (
        <article className="card" key={m.id}>
          <div className="msghead">
            <div><strong>{m.name}</strong> <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject ?? "your message")}`}>{m.email}</a><br /><span className="muted">{new Date(m.created_at).toLocaleString()}{m.subject && ` · ${m.subject}`}</span></div>
            <select aria-label="Status" value={m.status} onChange={(e) => run(() => api(`/admin/contact-messages/${m.id}`, { method: "PATCH", body: { status: e.target.value } }))}>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <p className="msgbody">{m.message}</p>
          <button className="btn ghost danger" onClick={() => confirm("Delete this message?") && run(() => api(`/admin/contact-messages/${m.id}`, { method: "DELETE" }))}>Delete</button>
        </article>
      ))}
    </>
  );
}
