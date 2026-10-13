import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { get } from "./api";
import type { Category, NavItem, Project, Service, SiteData, Skill, Settings, Social } from "./types";

type Mode = "dark" | "light";
type Ctx = { data: SiteData; mode: Mode; toggleMode: () => void; motion: boolean };
const SiteCtx = createContext<Ctx | undefined>(undefined);

export function useSite() {
  const v = useContext(SiteCtx);
  if (!v) throw new Error("useSite must be used inside SiteProvider");
  return v;
}

const list = <T,>(p: string) => get<{ data: T[] }>(p).then((r) => r.data);

function setMeta(attr: "name" | "property", key: string, content?: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}
function loadFont(id: string, family?: string) {
  if (!family) return;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) { link = document.createElement("link"); link.id = id; link.rel = "stylesheet"; document.head.appendChild(link); }
  link.href = `https://fonts.googleapis.com/css2?family=${family.trim().replace(/\s+/g, "+")}:wght@400;500;700&display=swap`;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData | null>(null);
  const [error, setError] = useState("");
  const [pref, setPref] = useState<Mode | null>(() => {
    try { const m = localStorage.getItem("mode"); return m === "dark" || m === "light" ? m : null; } catch { return null; }
  });

  const load = useCallback(() => {
    setError("");
    Promise.all([get<Settings>("/site"), list<Skill>("/skills"), list<Category>("/skill-categories"), list<Service>("/services"), list<Project>("/projects"), list<Social>("/social-links"), list<NavItem>("/navigation")])
      .then(([settings, skills, categories, services, projects, social, nav]) => setData({ settings, skills, categories, services, projects, social, nav }))
      .catch(() => setError("Cannot reach the server. Make sure it is running (npm run dev in the server folder)."));
  }, []);
  useEffect(load, [load]);

  const theme = data?.settings.theme;
  const dm = theme?.defaultMode ?? "dark";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const mode: Mode = pref ?? (dm === "system" ? (systemDark ? "dark" : "light") : dm);
  const motion = data?.settings.animation?.enabled !== false && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const { settings: s } = data;
    Object.entries(s.theme?.[mode] ?? {}).forEach(([k, v]) => root.style.setProperty(`--${k}`, String(v)));
    root.style.setProperty("--r-card", `${s.theme?.radius?.card ?? 16}px`);
    root.style.setProperty("--r-btn", `${s.theme?.radius?.button ?? 12}px`);
    root.style.setProperty("--maxw", `${s.theme?.layout?.maxWidth ?? 1200}px`);
    root.style.setProperty("--space", `${s.theme?.layout?.sectionSpacing ?? 120}px`);
    if (s.typography?.baseSize) root.style.fontSize = `${s.typography.baseSize}px`;
    if (s.typography?.lineHeight) root.style.setProperty("--lh", String(s.typography.lineHeight));
    if (s.typography?.heading) root.style.setProperty("--font-heading", `"${s.typography.heading}"`);
    if (s.typography?.body) root.style.setProperty("--font-body", `"${s.typography.body}"`);
    loadFont("font-heading", s.typography?.heading);
    loadFont("font-body", s.typography?.body);
    root.dataset.theme = mode;
  }, [data, mode]);

  useEffect(() => {
    const s = data?.settings;
    if (!s) return;
    document.title = s.seo?.title ?? s.site?.title ?? "Portfolio";
    setMeta("name", "description", s.seo?.description);
    setMeta("name", "keywords", s.seo?.keywords);
    setMeta("name", "robots", s.seo?.robots);
    setMeta("property", "og:title", s.seo?.ogTitle ?? s.seo?.title);
    setMeta("property", "og:description", s.seo?.ogDescription ?? s.seo?.description);
    setMeta("property", "og:image", s.seo?.ogImage);
  }, [data]);

  if (error) return <div className="state" role="alert"><p>{error}</p><button className="btn" onClick={load}>Try again</button></div>;
  if (!data) return <div className="state" aria-busy="true"><p>Loading…</p></div>;

  const toggleMode = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setPref(next);
    try { localStorage.setItem("mode", next); } catch { /* storage unavailable */ }
  };
  return <SiteCtx.Provider value={{ data, mode, toggleMode, motion }}>{children}</SiteCtx.Provider>;
}
