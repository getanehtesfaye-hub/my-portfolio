import type { ReactNode } from "react";

export type Obj = Record<string, unknown>;
export const getIn = (o: Obj, path: string): unknown => path.split(".").reduce<unknown>((a, k) => (a as Obj | undefined)?.[k], o);
export const setIn = (o: Obj, path: string, v: unknown): Obj => {
  const [k, ...rest] = path.split(".");
  return { ...o, [k]: rest.length ? setIn((o[k] as Obj) ?? {}, rest.join("."), v) : v };
};

export type Ctx = { get: (path: string) => unknown; set: (path: string, v: unknown) => void };
type P = { label: string; path: string; ctx: Ctx };

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="field"><span>{label}</span>{children}</label>
);
export const TextField = ({ label, path, ctx, multiline }: P & { multiline?: boolean }) => {
  const value = String(ctx.get(path) ?? "");
  return (
    <Field label={label}>
      {multiline
        ? <textarea rows={4} value={value} onChange={(e) => ctx.set(path, e.target.value)} />
        : <input value={value} onChange={(e) => ctx.set(path, e.target.value)} />}
    </Field>
  );
};
export const NumberField = ({ label, path, ctx, min, max, step }: P & { min?: number; max?: number; step?: number }) => (
  <Field label={label}>
    <input type="number" min={min} max={max} step={step} value={Number(ctx.get(path) ?? 0)} onChange={(e) => ctx.set(path, Number(e.target.value))} />
  </Field>
);
export const ColorField = ({ label, path, ctx }: P) => {
  const value = String(ctx.get(path) ?? "#000000");
  return (
    <Field label={label}>
      <span className="color">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => ctx.set(path, e.target.value)} />
        <input value={value} onChange={(e) => ctx.set(path, e.target.value)} />
      </span>
    </Field>
  );
};
export const CheckField = ({ label, path, ctx }: P) => (
  <label className="check"><input type="checkbox" checked={Boolean(ctx.get(path))} onChange={(e) => ctx.set(path, e.target.checked)} />{label}</label>
);
export const SelectField = ({ label, path, ctx, options }: P & { options: string[] }) => (
  <Field label={label}>
    <select value={String(ctx.get(path) ?? options[0])} onChange={(e) => ctx.set(path, e.target.value)}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  </Field>
);

export const LinesField = ({ label, path, ctx }: P) => {
  const v = ctx.get(path);
  return (
    <Field label={label}>
      <textarea rows={4} value={Array.isArray(v) ? v.join("\n") : ""} onChange={(e) => ctx.set(path, e.target.value.split("\n"))} />
      <small className="muted">One per line</small>
    </Field>
  );
};
