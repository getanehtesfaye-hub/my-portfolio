import { useEffect, useState } from "react";
import { api, errorText } from "../api";
import { useAuth } from "../auth";

type Row = Record<string, unknown>;
type Data = { projects: Row[]; skills: Row[]; services: Row[]; messages: Row[] };

export default function Overview() {
  const { admin } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<{ data: Row[] }>("/admin/projects"), api<{ data: Row[] }>("/admin/skills"), api<{ data: Row[] }>("/admin/services"), api<{ data: Row[] }>("/admin/contact-messages")])
      .then(([p, s, sv, m]) => setData({ projects: p.data, skills: s.data, services: sv.data, messages: m.data }))
      .catch((e) => setError(errorText(e)));
  }, []);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data) return <div className="skeleton" aria-busy="true" />;
  const newMsgs = data.messages.filter((m) => m.status === "new");
  const cards = [
    ["Projects", `${data.projects.filter((p) => p.status === "published").length} published`, `${data.projects.length} total`],
    ["Skills", String(data.skills.length), "in your portfolio"],
    ["Services", String(data.services.length), "offered"],
    ["New messages", String(newMsgs.length), `${data.messages.length} total`],
  ];
  return (
    <>
      <h1>Welcome back</h1>
      <p className="muted">{admin?.email}</p>
      <div className="stats">
        {cards.map(([label, big, small]) => (
          <div className="card stat" key={label}><p className="muted">{label}</p><p className="big">{big}</p><p className="muted">{small}</p></div>
        ))}
      </div>
      <section className="card">
        <h2>Recent messages</h2>
        {data.messages.length === 0 && <p className="muted">No messages yet. Messages from your contact form will appear here.</p>}
        <ul className="list">
          {data.messages.slice(0, 5).map((m) => (
            <li key={String(m.id)}><strong>{String(m.name)}</strong> <span className="muted">{String(m.email)}</span><br />{String(m.message).slice(0, 120)}</li>
          ))}
        </ul>
      </section>
      <p className="muted">Analytics (visitors, page views, projects viewed) arrives in the analytics phase.</p>
    </>
  );
}
