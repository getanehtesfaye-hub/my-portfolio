import { useEffect, useState, type FormEvent } from "react";
import { Link, Route } from "react-router-dom";
import { api, errorText } from "../api";
import SettingEditor from "../components/SettingEditor";
import { CheckField, NumberField, SelectField, TextField, getIn, type Obj } from "../components/ui";
import Analytics from "./Analytics";
import Media from "./Media";

function FontPreview({ v }: { v: Obj }) {
  const heading = String(getIn(v, "heading") ?? ""), body = String(getIn(v, "body") ?? "");
  useEffect(() => {
    const t = setTimeout(() => [heading, body].filter(Boolean).forEach((f, i) => {
      const id = `pv-font-${i}`;
      const link = (document.getElementById(id) as HTMLLinkElement | null) ?? Object.assign(document.createElement("link"), { id, rel: "stylesheet" });
      link.href = `https://fonts.googleapis.com/css2?family=${f.trim().replace(/\s+/g, "+")}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }), 500);
    return () => clearTimeout(t);
  }, [heading, body]);
  return (
    <div className="preview hero" style={{ fontSize: Number(getIn(v, "baseSize") ?? 16), lineHeight: Number(getIn(v, "lineHeight") ?? 1.6) }}>
      <h2 style={{ fontFamily: `"${heading}", sans-serif`, fontSize: "2em", margin: 0 }}>Creative developer</h2>
      <p style={{ fontFamily: `"${body}", sans-serif` }}>The quick brown fox jumps over the lazy dog. Choose fonts from the lists on the left.</p>
    </div>
  );
}

const FONTS = ["Bricolage Grotesque", "DM Sans", "Inter", "Poppins", "Montserrat", "Space Grotesk", "Sora", "Manrope", "Outfit", "Plus Jakarta Sans", "Urbanist", "Lexend", "Syne", "Unbounded", "Archivo", "Work Sans", "Raleway", "Roboto", "Open Sans", "Playfair Display", "Fraunces", "Lora", "Merriweather", "JetBrains Mono"];
const fontOptions = (current: unknown) => (typeof current === "string" && current && !FONTS.includes(current) ? [current, ...FONTS] : FONTS);

const Typography = () => (
  <SettingEditor settingKey="typography" title="Typography" description="Fonts and text size for the public site." preview={(v) => <FontPreview v={v} />}
    render={(ctx) => (<>
      <SelectField label="Heading font" path="heading" ctx={ctx} options={fontOptions(ctx.get("heading"))} /><SelectField label="Body font" path="body" ctx={ctx} options={fontOptions(ctx.get("body"))} />
      <NumberField label="Base font size (px)" path="baseSize" ctx={ctx} min={12} max={22} /><NumberField label="Line height" path="lineHeight" ctx={ctx} min={1.2} max={2} step={0.05} />
    </>)} />
);
const Animations = () => (
  <SettingEditor settingKey="animation" title="Animations" description="Motion across the public site. The site always respects a visitor's reduced-motion setting."
    preview={(v) => <div className="preview hero"><p>{getIn(v, "enabled") === false ? "Animations are off: the 3D laptop scroll scene is replaced by a still image." : `Animations on, speed ${String(getIn(v, "speed") ?? 1)}x.`}</p></div>}
    render={(ctx) => (<>
      <CheckField label="Enable animations (includes the 3D scroll scene)" path="enabled" ctx={ctx} />
      <NumberField label="Animation speed" path="speed" ctx={ctx} min={0.2} max={3} step={0.1} />
    </>)} />
);
const SiteSettings = () => (
  <SettingEditor settingKey="site" title="Site settings" description="Brand name and default page title."
    preview={(v) => <div className="preview hero"><h2 style={{ margin: 0 }}>{String(getIn(v, "brandName") ?? "")}</h2><p className="muted">{String(getIn(v, "tagline") ?? "")}</p></div>}
    render={(ctx) => (<>
      <Link className="btn" to="/settings/analytics">Analytics and privacy settings</Link>
      <TextField label="Brand name" path="brandName" ctx={ctx} /><TextField label="Tagline" path="tagline" ctx={ctx} /><TextField label="Browser title" path="title" ctx={ctx} />
    </>)} />
);
const AnalyticsSettings = () => (
  <SettingEditor settingKey="analytics" title="Analytics and privacy" description="Control what the site measures."
    preview={(v) => <div className="preview hero"><p>{getIn(v, "enabled") === false ? "Analytics is off. Nothing is recorded." : `Recording anonymous visits. Data older than ${String(getIn(v, "retentionDays") ?? 365)} days is deleted automatically.`}</p></div>}
    render={(ctx) => (<>
      <CheckField label="Enable analytics (visitors who send Do Not Track are never recorded)" path="enabled" ctx={ctx} />
      <NumberField label="Keep data for (days, minimum 7)" path="retentionDays" ctx={ctx} min={7} max={1095} />
    </>)} />
);

function Account() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    if (f.get("next") !== f.get("confirm")) return setMsg({ ok: false, text: "The new passwords do not match" });
    try { await api("/admin/account/password", { method: "POST", body: { current: f.get("current"), next: f.get("next") } }); setMsg({ ok: true, text: "Password changed" }); form.reset(); }
    catch (err) { setMsg({ ok: false, text: errorText(err) }); }
  }
  return (
    <form className="card login" style={{ margin: 0 }} onSubmit={submit}>
      <h1>Admin account</h1>
      <label className="field"><span>Current password</span><input name="current" type="password" required autoComplete="current-password" /></label>
      <label className="field"><span>New password (at least 12 characters)</span><input name="next" type="password" required minLength={12} autoComplete="new-password" /></label>
      <label className="field"><span>Repeat new password</span><input name="confirm" type="password" required minLength={12} autoComplete="new-password" /></label>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "" : "error"}>{msg.text}</p>}
      <button className="btn primary">Change password</button>
    </form>
  );
}

export const moreRoutes = (
  <>
    <Route path="design/typography" element={<Typography />} />
    <Route path="design/animations" element={<Animations />} />
    <Route path="analytics" element={<Analytics />} />
    <Route path="media" element={<Media />} />
    <Route path="settings" element={<SiteSettings />} />
    <Route path="settings/analytics" element={<AnalyticsSettings />} />
    <Route path="account" element={<Account />} />
  </>
);
