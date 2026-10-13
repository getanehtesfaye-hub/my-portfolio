import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool";
import { validate } from "../middleware/validate";
import { HttpError } from "../utils/errors";

export const SETTING_KEYS = ["site", "theme", "typography", "animation", "hero", "about", "seo", "footer", "chatbot", "contact", "analytics"] as const;
const keySchema = z.enum(SETTING_KEYS);
const body = z.object({ data: z.record(z.string(), z.unknown()) });
type Json = Record<string, unknown>;

export const publicSettings = Router();
export const adminSettings = Router();

publicSettings.get("/site", async (_req, res) => {
  const rows = await query<{ key: string; published: Json }>("select key, published from site_settings");
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.published])));
});
for (const key of SETTING_KEYS.filter((k) => k !== "site")) {
  publicSettings.get(`/${key}`, async (_req, res) => {
    const [row] = await query<{ published: Json }>("select published from site_settings where key = $1", [key]);
    res.json(row?.published ?? {});
  });
}

adminSettings.get("/:key", async (req, res) => {
  const key = keySchema.parse(req.params.key);
  const [row] = await query<{ draft: Json; published: Json; published_at: string | null }>(
    "select draft, published, published_at from site_settings where key = $1", [key]);
  const draft = row?.draft ?? {}, published = row?.published ?? {};
  res.json({ draft, published, publishedAt: row?.published_at ?? null, hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(published) });
});
adminSettings.put("/:key", validate(body), async (req, res) => {
  const key = keySchema.parse(req.params.key);
  const [row] = await query<{ draft: Json }>(
    "insert into site_settings (key, draft) values ($1, $2) on conflict (key) do update set draft = excluded.draft returning draft",
    [key, JSON.stringify(req.body.data)]);
  res.json({ draft: row.draft });
});
adminSettings.post("/:key/publish", async (req, res) => {
  const key = keySchema.parse(req.params.key);
  const [row] = await query<{ published: Json }>(
    `insert into site_settings (key, published, published_at) values ($1, '{}', now())
     on conflict (key) do update set published = site_settings.draft, published_at = now() returning published`, [key]);
  await query("insert into settings_versions (key, data) values ($1, $2)", [key, JSON.stringify(row.published)]);
  res.json({ published: row.published });
});
adminSettings.post("/:key/reset", async (req, res) => {
  const key = keySchema.parse(req.params.key);
  const [row] = await query<{ draft: Json }>("update site_settings set draft = published where key = $1 returning draft", [key]);
  res.json({ draft: row?.draft ?? {} });
});
adminSettings.get("/:key/versions", async (req, res) => {
  const key = keySchema.parse(req.params.key);
  res.json({ data: await query("select id, created_at from settings_versions where key = $1 order by created_at desc limit 20", [key]) });
});
adminSettings.post("/:key/restore", validate(z.object({ versionId: z.string().uuid() })), async (req, res) => {
  const key = keySchema.parse(req.params.key);
  const [version] = await query<{ data: Json }>("select data from settings_versions where id = $1 and key = $2", [req.body.versionId, key]);
  if (!version) throw new HttpError(404, "Version not found");
  await query("update site_settings set draft = $2 where key = $1", [key, JSON.stringify(version.data)]);
  res.json({ draft: version.data });
});
