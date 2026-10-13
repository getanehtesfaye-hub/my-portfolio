import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSite } from "../SiteContext";
import { SmartLink } from "./Nav";
import "../hero.css";

const Scene3D = lazy(() => import("./Scene3D"));

class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
const hasWebGL = () => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } };
const pad = (n: number) => String(n).padStart(2, "0");
const LaptopFallback = () => <div className="lap" aria-hidden="true"><div className="lap-screen" /><div className="lap-base" /></div>;

export default function Hero() {
  const { data, mode, motion } = useSite();
  const h = data.settings.hero ?? {};
  const pal = data.settings.theme?.[mode] ?? {};
  const box = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(true);
  const [step, setStep] = useState(-1);
  const webgl = useMemo(hasWebGL, []);
  const small = window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 2;
  const show3D = motion && webgl && !small;

  const showcase = useMemo(() => [...data.projects].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 4), [data.projects]);
  const screen = useMemo(() => ({
    brand: data.settings.site?.brandName ?? h.title ?? "Portfolio", subtitle: h.subtitle ?? "",
    projects: showcase.map((p) => ({ title: p.title, category: p.category ?? "", text: p.short_description ?? "" })),
  }), [data.settings.site?.brandName, h.title, h.subtitle, showcase]);
  const colors = useMemo(() => ({
    background: pal.background ?? "#0a0c14", surface: pal.surface ?? "#12151f", primary: pal.primary ?? "#7c6cff", accent: pal.accent ?? "#ffb454", text: pal.text ?? "#e9ecf5",
  }), [pal.background, pal.surface, pal.primary, pal.accent, pal.text]);

  useEffect(() => {
    const el = box.current;
    if (!el || !show3D) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      progress.current = p;
      el.style.setProperty("--p", p.toFixed(3));
      el.toggleAttribute("data-faded", p > 0.3);
      setActive(r.bottom > 0 && r.top < window.innerHeight);
      setStep(showcase.length && p > 0.5 ? Math.min(showcase.length - 1, Math.floor(((p - 0.5) / 0.5) * showcase.length)) : -1);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [show3D, showcase]);

  if (h.visible === false) return null;
  const sc = h.scene ?? {};
  const fallback = <LaptopFallback />;
  return (
    <section id="home" ref={box} className={`hero ${show3D ? "stage" : "static"} ${h.alignment === "center" ? "center" : ""}`}>
      <div className="sticky">
        <div className="scene" aria-hidden="true">
          {show3D ? (
            <Guard fallback={fallback}>
              <Suspense fallback={fallback}>
                <Scene3D progress={progress} screen={screen} colors={colors} scale={sc.scale ?? 1} speed={(sc.speed ?? 1) * (data.settings.animation?.speed ?? 1)}
                  mouse={sc.mouse !== false} particles={sc.particles?.visible === false ? 0 : Math.min(sc.particles?.count ?? 300, 1200)} active={active} />
              </Suspense>
            </Guard>
          ) : fallback}
        </div>
        <div className="wrap herotext">
          {h.subtitle && <p className="eyebrow rise" style={{ animationDelay: ".1s" }}>{h.subtitle}</p>}
          <h1 className="display rise" style={{ animationDelay: ".2s" }}>{h.title}</h1>
          {h.description && <p className="lead rise" style={{ animationDelay: ".35s" }}>{h.description}</p>}
          <div className="ctas rise" style={{ animationDelay: ".5s" }}>
            {h.primaryCta?.label && <SmartLink className="btn primary" href={h.primaryCta.href ?? "#"}>{h.primaryCta.label}</SmartLink>}
            {h.secondaryCta?.label && <SmartLink className="btn" href={h.secondaryCta.href ?? "#"}>{h.secondaryCta.label}</SmartLink>}
          </div>
          <ul className="socials rise" style={{ animationDelay: ".65s" }} aria-label="Social links">
            {data.social.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label || s.platform}</a></li>)}
          </ul>
        </div>
        {show3D && <p className="hint" aria-hidden="true">Scroll to explore</p>}
        {show3D && step >= 0 && (
          <p className="caption" aria-live="polite">
            <span className="muted">{pad(step + 1)} / {pad(showcase.length)}</span>
            <strong>{showcase[step].title}</strong>
            <Link to={`/projects/${showcase[step].slug}`}>View project →</Link>
          </p>
        )}
      </div>
    </section>
  );
}
