import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { query } from "../db/pool";
import { validate } from "../middleware/validate";
import { HttpError } from "../utils/errors";

export const rootRoutes = Router();
export const adminAccount = Router();

async function seo() {
  const [r] = await query<{ published: { canonicalUrl?: string; robots?: string } }>("select published from site_settings where key = 'seo'");
  return { base: (r?.published.canonicalUrl || env.CLIENT_ORIGIN).replace(/\/+$/, ""), robots: r?.published.robots ?? "index,follow" };
}

rootRoutes.get("/robots.txt", async (_req, res) => {
  const s = await seo();
  res.type("text/plain").send(`User-agent: *\n${s.robots.includes("noindex") ? "Disallow: /" : "Allow: /"}\nSitemap: ${s.base}/sitemap.xml\n`);
});

rootRoutes.get("/sitemap.xml", async (_req, res) => {
  const s = await seo();
  const base = s.base.replace(/&/g, "&amp;");
  const projects = await query<{ slug: string; updated_at: Date }>("select slug, updated_at from projects where status = 'published' order by sort_order");
  const urls = [`<url><loc>${base}/</loc></url>`, ...projects.map((p) => `<url><loc>${base}/projects/${p.slug}</loc><lastmod>${p.updated_at.toISOString().slice(0, 10)}</lastmod></url>`)];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`);
});

adminAccount.post("/account/password", validate(z.object({ current: z.string().max(128), next: z.string().min(12, "Use at least 12 characters").max(128) })), async (req, res) => {
  const [a] = await query<{ password_hash: string }>("select password_hash from admins where id = $1", [req.adminId]);
  if (!a || !(await bcrypt.compare(req.body.current, a.password_hash))) throw new HttpError(400, "Current password is incorrect");
  await query("update admins set password_hash = $1 where id = $2", [await bcrypt.hash(req.body.next, 12), req.adminId]);
  res.json({ ok: true });
});
