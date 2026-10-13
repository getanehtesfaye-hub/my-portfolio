import SettingEditor from "../components/SettingEditor";
import { CheckField, NumberField, SelectField, TextField, getIn, type Obj } from "../components/ui";

function Preview({ v }: { v: Obj }) {
  const s = (path: string) => String(getIn(v, path) ?? "");
  if (getIn(v, "visible") === false) return <p className="preview empty">The hero section is hidden.</p>;
  return (
    <div className="preview hero" style={{ textAlign: s("alignment") === "center" ? "center" : "left" }}>
      <p className="muted">{s("subtitle")}</p>
      <h2 style={{ fontSize: 32, margin: "4px 0" }}>{s("title")}</h2>
      <p>{s("description")}</p>
      <button className="btn primary">{s("primaryCta.label")}</button>{" "}
      <button className="btn ghost">{s("secondaryCta.label")}</button>
    </div>
  );
}

export default function HeroEditor() {
  return (
    <SettingEditor
      settingKey="hero"
      title="Hero"
      description="The first screen visitors see. 3D scene options take effect when the 3D hero is built."
      preview={(v) => <Preview v={v} />}
      render={(ctx) => (
        <>
          <CheckField label="Show the hero section" path="visible" ctx={ctx} />
          <SelectField label="Text alignment" path="alignment" ctx={ctx} options={["left", "center"]} />
          <TextField label="Title" path="title" ctx={ctx} />
          <TextField label="Subtitle" path="subtitle" ctx={ctx} />
          <TextField label="Description" path="description" ctx={ctx} multiline />
          <h2>Buttons</h2>
          <TextField label="Primary button label" path="primaryCta.label" ctx={ctx} />
          <TextField label="Primary button link" path="primaryCta.href" ctx={ctx} />
          <TextField label="Secondary button label" path="secondaryCta.label" ctx={ctx} />
          <TextField label="Secondary button link" path="secondaryCta.href" ctx={ctx} />
          <h2>3D scene</h2>
          <NumberField label="Model scale" path="scene.scale" ctx={ctx} min={0.2} max={3} step={0.1} />
          <NumberField label="Animation speed" path="scene.speed" ctx={ctx} min={0} max={3} step={0.1} />
          <CheckField label="React to mouse movement" path="scene.mouse" ctx={ctx} />
          <CheckField label="Show particles" path="scene.particles.visible" ctx={ctx} />
          <NumberField label="Particle count" path="scene.particles.count" ctx={ctx} min={0} max={2000} step={50} />
        </>
      )}
    />
  );
}
