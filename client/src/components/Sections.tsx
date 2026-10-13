import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { post } from "../api";
import { track } from "../analytics";
import { useSite } from "../SiteContext";
import { SmartLink } from "./Nav";
import Tilt from "./Tilt";

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { motion } = useSite();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!motion) { el.classList.add("in"); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [motion]);
  return (
    <section id={id} ref={ref} className="section reveal" aria-labelledby={`${id}-h`}>
      <div className="wrap"><h2 id={`${id}-h`} className="h2">{title}</h2>{children}</div>
    </section>
  );
}

export function About() {
  const { data } = useSite();
  const a = data.settings.about;
  if (!a) return null;
  return (
    <Section id="about" title="About">
      <div className="two">
        <div>
          <p className="lead">{a.shortBio}</p>
          <p className="muted pre">{a.longBio}</p>
          {a.resumeUrl && <SmartLink className="btn" href={a.resumeUrl}>Download résumé</SmartLink>}
        </div>
        <dl className="facts">
          {a.title && <><dt>Role</dt><dd>{a.title}</dd></>}
          {a.location && <><dt>Based in</dt><dd>{a.location}</dd></>}
          {a.yearsExperience !== undefined && <><dt>Experience</dt><dd>{a.yearsExperience} {a.yearsExperience === 1 ? "year" : "years"}</dd></>}
        </dl>
      </div>
    </Section>
  );
}

export function Skills() {
  const { data } = useSite();
  if (data.skills.length === 0) return null;
  const groups = new Map<string, typeof data.skills>();
  data.skills.forEach((s) => {
    const name = data.categories.find((c) => c.id === s.category_id)?.name ?? "Other";
    groups.set(name, [...(groups.get(name) ?? []), s]);
  });
  return (
    <Section id="skills" title="Skills">
      <div className="grid3">
        {[...groups].map(([name, items]) => (
          <div key={name}>
            <h3 className="h3">{name}</h3>
            <div className="skillgrid">
              {items.map((s) => (
                <Tilt key={s.id}>
                  <div className={`card skill ${s.featured ? "feat" : ""}`}>
                    <div className="skillhead">
                      <strong>{s.name}</strong>
                      {Number(s.years) > 0 && <span className="yrs">{Number(s.years)} {Number(s.years) === 1 ? "year" : "years"}</span>}
                    </div>
                    {s.description && <p className="muted">{s.description}</p>}
                  </div>
                </Tilt>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Services() {
  const { data } = useSite();
  if (data.services.length === 0) return null;
  return (
    <Section id="services" title="Services">
      <div className="grid3">
        {data.services.map((s) => (
          <article className="card" key={s.id}>
            <h3 className="h3">{s.title}</h3>
            {s.short_description && <p className="lead-sm">{s.short_description}</p>}
            {s.long_description && <p className="muted service-desc">{s.long_description}</p>}
            {s.features.length > 0 && <ul className="ticks">{s.features.map((f) => <li key={f}>{f}</li>)}</ul>}
            {s.price && <p className="price">{s.price}</p>}
            {s.cta_label && s.cta_url && <SmartLink className="btn" href={s.cta_url}>{s.cta_label}</SmartLink>}
          </article>
        ))}
      </div>
    </Section>
  );
}

export function Projects() {
  const { data } = useSite();
  if (data.projects.length === 0) return null;
  const sorted = [...data.projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <Section id="projects" title="Selected work">
      <div className="grid2">
        {sorted.map((p) => (
          <Tilt key={p.id}><Link to={`/projects/${p.slug}`} className="card project">
            <div className="thumb" style={p.main_image_url ? { backgroundImage: `url("${p.main_image_url}")` } : undefined} role="img" aria-label={p.main_image_url ? `${p.title} preview` : ""} />
            <p className="eyebrow">{p.category}{p.featured && " · Featured"}</p>
            <h3 className="h3">{p.title}</h3>
            <p className="muted">{p.short_description}</p>
          </Link></Tilt>
        ))}
      </div>
    </Section>
  );
}

function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setState("sending");
    try {
      await post("/contact", { name: f.get("name"), email: f.get("email"), subject: f.get("subject") || undefined, message: f.get("message"), website: f.get("website") });
      setState("sent");
      track("contact_submit");
      form.reset();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong");
      setState("error");
    }
  }
  return (
    <form onSubmit={submit} className="form">
      <label>Name<input name="name" required maxLength={100} autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Subject (optional)<input name="subject" maxLength={150} /></label>
      <label>Message<textarea name="message" rows={5} required minLength={10} maxLength={5000} /></label>
      <input name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="btn primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
      {state === "sent" && <p role="status" className="ok">Thank you. Your message was sent.</p>}
      {state === "error" && <p role="alert" className="bad">{err}</p>}
    </form>
  );
}

export function Contact() {
  const { data } = useSite();
  const c = data.settings.contact ?? {};
  return (
    <Section id="contact" title="Contact">
      <div className="two">
        <div>
          {c.availability && <p className="lead">{c.availability}</p>}
          <ul className="facts plain">
            {c.email && <li><a href={`mailto:${c.email}`}>{c.email}</a></li>}
            {c.showPhone && c.phone && <li><a href={`tel:${c.phone}`}>{c.phone}</a></li>}
            {c.location && <li>{c.location}</li>}
          </ul>
          <ul className="socials">{data.social.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label || s.platform}</a></li>)}</ul>
        </div>
        <ContactForm />
      </div>
    </Section>
  );
}

export function SiteFooter() {
  const { data } = useSite();
  const f = data.settings.footer;
  if (f?.visible === false) return null;
  return (
    <footer className="footer">
      <div className="wrap foot">
        <div><p>{f?.text}</p><p className="muted">{f?.copyright}</p></div>
        <nav aria-label="Footer">
          {data.nav.map((n) => <SmartLink key={n.id} href={n.href}>{n.label}</SmartLink>)}
          {data.social.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.label || s.platform}</a>)}
        </nav>
      </div>
    </footer>
  );
}
