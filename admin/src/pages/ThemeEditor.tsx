import { useState } from "react";
import SettingEditor from "../components/SettingEditor";
import { CheckField, ColorField, NumberField, SelectField, getIn, type Obj } from "../components/ui";

const colors = ["background", "surface", "card", "text", "muted", "border", "primary", "secondary", "accent", "error", "success"];

function Preview({ v }: { v: Obj }) {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const p = (getIn(v, mode) as Record<string, string> | undefined) ?? {};
  const r = (getIn(v, "radius") as { card?: number; button?: number } | undefined) ?? {};
  const btn = { background: p.primary, color: "#fff", border: 0, padding: "8px 16px", borderRadius: r.button ?? 12 };
  return (
    <>
      <div className="seg">
        {(["dark", "light"] as const).map((m) => <button key={m} className={`btn ${mode === m ? "primary" : "ghost"}`} onClick={() => setMode(m)}>{m}</button>)}
      </div>
      <div className="preview" style={{ background: p.background, color: p.text, borderColor: p.border }}>
        <div style={{ background: p.card, border: `1px solid ${p.border}`, borderRadius: r.card ?? 16, padding: 16 }}>
          <h3 style={{ margin: 0 }}>Sample project</h3>
          <p style={{ color: p.muted }}>This is how cards and muted text will look.</p>
          <button style={btn}>Primary button</button>{" "}
          <span style={{ color: p.secondary }}>secondary</span>{" "}
          <span style={{ color: p.accent }}>accent</span>{" "}
          <span style={{ color: p.success }}>success</span>{" "}
          <span style={{ color: p.error }}>error</span>
        </div>
      </div>
    </>
  );
}

export default function ThemeEditor() {
  return (
    <SettingEditor
      settingKey="theme"
      title="Theme and colors"
      description="Colors, corners and layout for the whole public site."
      preview={(v) => <Preview v={v} />}
      render={(ctx) => (
        <>
          <SelectField label="Default mode" path="defaultMode" ctx={ctx} options={["dark", "light", "system"]} />
          <CheckField label="Show the dark/light switcher" path="switcher" ctx={ctx} />
          <h2>Dark colors</h2>
          {colors.map((c) => <ColorField key={c} label={c} path={`dark.${c}`} ctx={ctx} />)}
          <h2>Light colors</h2>
          {colors.map((c) => <ColorField key={c} label={c} path={`light.${c}`} ctx={ctx} />)}
          <h2>Shape and layout</h2>
          <NumberField label="Card corner radius (px)" path="radius.card" ctx={ctx} min={0} max={48} />
          <NumberField label="Button corner radius (px)" path="radius.button" ctx={ctx} min={0} max={48} />
          <NumberField label="Maximum content width (px)" path="layout.maxWidth" ctx={ctx} min={800} max={1800} step={20} />
          <NumberField label="Section spacing (px)" path="layout.sectionSpacing" ctx={ctx} min={40} max={240} step={10} />
        </>
      )}
    />
  );
}
