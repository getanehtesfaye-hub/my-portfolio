import { Router } from "express";
import { z, type ZodObject, type ZodRawShape } from "zod";
import { crudRepo } from "../utils/crud";
import { validate } from "../middleware/validate";
import { HttpError } from "../utils/errors";

const text = (max = 200) => z.string().trim().max(max);
const link = z.string().trim().max(500).refine((v) => /^(https?:\/\/|\/|#|mailto:|tel:)/.test(v), "Enter a valid link"); // blocks javascript: URLs
const order = z.number().int().min(0).optional();
const bool = z.boolean().optional();
const uuid = z.string().uuid();

type Resource = { path: string; table: string; schema: ZodObject<ZodRawShape>; publicWhere?: string };

const resources: Resource[] = [
  { path: "skill-categories", table: "skill_categories", schema: z.object({ name: text(80).min(1), sort_order: order }) },
  { path: "skills", table: "skills", publicWhere: "visible", schema: z.object({
    category_id: uuid.nullable().optional(), name: text(100).min(1), icon: text(60).optional(), description: text(500).optional(),
    level: z.number().int().min(0).max(100).optional(), years: z.number().min(0).max(60).optional(), featured: bool, visible: bool, sort_order: order }) },
  { path: "services", table: "services", publicWhere: "visible", schema: z.object({
    title: text(120).min(1), short_description: text(300).optional(), long_description: text(5000).optional(), icon: text(60).optional(),
    image_url: link.nullable().optional(), features: z.array(text(120)).max(20).optional(), price: text(80).optional(),
    cta_label: text(60).optional(), cta_url: link.nullable().optional(), visible: bool, sort_order: order }) },
  { path: "projects", table: "projects", publicWhere: "status = 'published'", schema: z.object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80), title: text(150).min(1), short_description: text(300).optional(),
    full_description: text(20000).optional(), category: text(80).optional(), main_image_url: link.nullable().optional(),
    video_url: link.nullable().optional(), live_url: link.nullable().optional(), github_url: link.nullable().optional(),
    case_study: text(50000).optional(), client: text(120).optional(), completed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    featured: bool, status: z.enum(["draft", "published"]).optional(), sort_order: order }) },
  { path: "social-links", table: "social_links", publicWhere: "visible", schema: z.object({
    platform: text(40).min(1), label: text(80).optional(), url: link, icon: text(60).optional(), visible: bool, sort_order: order }) },
  { path: "navigation", table: "navigation_items", publicWhere: "visible", schema: z.object({
    label: text(60).min(1), href: link, visible: bool, sort_order: order }) },
  { path: "faq-categories", table: "faq_categories", schema: z.object({ name: text(80).min(1), sort_order: order }) },
  { path: "faqs", table: "faqs", publicWhere: "active", schema: z.object({
    category_id: uuid.nullable().optional(), question: text(300).min(1), answer: text(3000).min(1),
    keywords: z.array(text(40)).max(30).optional(), priority: z.number().int().min(0).max(100).optional(), active: bool, sort_order: order }) },
];

export const publicContent = Router();
export const adminContent = Router();

for (const r of resources) {
  const repo = crudRepo(r.table, Object.keys(r.schema.shape));
  const id = (v: string | string[]) => uuid.safeParse(String(v)).data ?? (() => { throw new HttpError(400, "Invalid id"); })();

  publicContent.get(`/${r.path}`, async (_req, res) => void res.json({ data: await repo.list(r.publicWhere) }));

  adminContent.get(`/${r.path}`, async (_req, res) => void res.json({ data: await repo.list() }));
  adminContent.post(`/${r.path}`, validate(r.schema), async (req, res) => void res.status(201).json({ data: await repo.create(req.body) }));
  adminContent.put(`/${r.path}/reorder`, validate(z.object({ ids: z.array(uuid).max(500) })), async (req, res) => {
    await repo.reorder(req.body.ids);
    res.json({ ok: true });
  });
  adminContent.put(`/${r.path}/:id`, validate(r.schema.partial()), async (req, res) => {
    const row = await repo.update(id(req.params.id), req.body);
    if (!row) throw new HttpError(404, "Item not found, or nothing to update");
    res.json({ data: row });
  });
  adminContent.delete(`/${r.path}/:id`, async (req, res) => {
    if (!(await repo.remove(id(req.params.id)))) throw new HttpError(404, "Item not found");
    res.json({ ok: true });
  });
}
