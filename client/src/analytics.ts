import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
let on = true;

function ids() {
  try {
    let v = localStorage.getItem("vid");
    if (!v) { v = crypto.randomUUID(); localStorage.setItem("vid", v); }
    let s = sessionStorage.getItem("sid");
    if (!s) { s = crypto.randomUUID(); sessionStorage.setItem("sid", s); }
    return { v, s };
  } catch { return null; }
}

// Anonymous by design: a random id, the page path, coarse screen size. Honors the browser's Do Not Track setting.
export function track(type: string, target?: string, extra: Record<string, unknown> = {}) {
  const i = ids();
  if (!on || !i) return;
  fetch(`${BASE}/analytics/collect`, {
    method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
    body: JSON.stringify({ sessionId: i.s, visitorId: i.v, type, path: location.pathname, target, screen: `${screen.width}x${screen.height}`, ...extra }),
  }).catch(() => undefined);
}

export function Tracker({ enabled }: { enabled: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => { on = enabled && navigator.doNotTrack !== "1"; }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    let referrer: string | undefined;
    try { const h = document.referrer ? new URL(document.referrer).hostname : ""; referrer = h && h !== location.hostname ? h : undefined; } catch { /* no referrer */ }
    track("pageview", undefined, { path: pathname, referrer });
    const done = () => track("duration", undefined, { path: pathname, ms: Math.round(performance.now() - start) });
    window.addEventListener("pagehide", done);
    return () => { window.removeEventListener("pagehide", done); done(); };
  }, [pathname, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (/\.pdf($|\?)/i.test(href)) track("resume_download", href);
      else if (a.closest(".socials")) track("social_click", href);
      else if (a.target === "_blank") track("external_click", href);
      else if (a.classList.contains("btn")) track("cta_click", (a.textContent ?? "").trim().slice(0, 60));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled]);
  return null;
}
