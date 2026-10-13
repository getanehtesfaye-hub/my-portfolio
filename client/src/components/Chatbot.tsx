import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { get, postJson } from "../api";
import { track } from "../analytics";
import { useSite } from "../SiteContext";
import "../chatbot.css";

type Msg = { from: "bot" | "user"; text: string };

export default function Chatbot() {
  const { data } = useSite();
  const c = data.settings.chatbot;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [faqs, setFaqs] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const welcome = c?.welcome ?? "Hi! How can I help?";

  const reset = useCallback(() => setMsgs([{ from: "bot", text: welcome }]), [welcome]);
  useEffect(reset, [reset]);

  useEffect(() => {
    if (c?.openBehavior !== "auto-open") return;
    try { if (sessionStorage.getItem("chat-seen")) return; } catch { return; }
    const t = setTimeout(() => { setOpen(true); try { sessionStorage.setItem("chat-seen", "1"); } catch { /* ignore */ } }, 4000);
    return () => clearTimeout(t);
  }, [c?.openBehavior]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    if (faqs.length === 0) get<{ data: { question: string }[] }>("/faqs").then((r) => setFaqs(r.data.slice(0, 4).map((f) => f.question))).catch(() => undefined);
  }, [open, faqs.length]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, open]);

  if (!c || c.enabled === false) return null;
  const name = c.name ?? "Assistant";
  const suggestions = (c.suggested ?? []).filter(Boolean).length ? (c.suggested ?? []).filter(Boolean) : faqs;

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { from: "user", text: q }]);
    setText("");
    setBusy(true);
    track("chatbot_ask");
    try {
      const r = await postJson<{ answer: string }>("/chatbot/query", { question: q });
      setMsgs((m) => [...m, { from: "bot", text: r.answer }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); ask(text); };

  return (
    <div className={`chat ${c.position === "bottom-left" ? "left" : ""}`} style={{ "--chat": c.primaryColor ?? "var(--primary)" } as CSSProperties}>
      {open && (
        <section className="chat-win" role="dialog" aria-label={`Chat with ${name}`} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <header>
            <strong>{name}</strong>
            <span>
              <button onClick={reset} aria-label="Reset conversation">Reset</button>
              <button onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
            </span>
          </header>
          <div className="log" role="log" aria-live="polite">
            {msgs.map((m, i) => <p key={i} className={`msg ${m.from}`}>{m.text}</p>)}
            {busy && <p className="msg bot">…</p>}
            <div ref={endRef} />
          </div>
          {msgs.length === 1 && suggestions.length > 0 && (
            <div className="sugg">{suggestions.map((q) => <button key={q} onClick={() => { track("faq_click", q); ask(q); }}>{q}</button>)}</div>
          )}
          <form onSubmit={submit}>
            <input ref={inputRef} aria-label="Your question" placeholder={c.placeholder ?? "Ask a question"} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} />
            <button disabled={busy || !text.trim()}>Send</button>
          </form>
        </section>
      )}
      <button className="chat-fab" aria-expanded={open} aria-label={open ? "Close chat" : `Open chat with ${name}`} onClick={() => { if (!open) track("chatbot_open"); setOpen(!open); }}>{open ? "✕" : "Chat"}</button>
    </div>
  );
}
