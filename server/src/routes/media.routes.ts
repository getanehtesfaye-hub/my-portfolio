import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { Router } from "express";
import { env } from "../config/env";
import { query } from "../db/pool";
import { HttpError } from "../utils/errors";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const adminMedia = Router();
type Asset = { id: string; file_name: string; storage_path: string; url: string; mime_type: string; size_bytes: string; created_at: string };

const remote = () => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
const authHeaders = () => ({ Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "" });

// The file's real type is read from its first bytes, never trusted from the browser. SVG is refused (script risk).
function sniff(b: Buffer): { mime: string; ext: string } | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") return { mime: "image/png", ext: "png" };
  if (b[0] === 0xff && b[1] === 0xd8) return { mime: "image/jpeg", ext: "jpg" };
  if (b.toString("ascii", 0, 3) === "GIF") return { mime: "image/gif", ext: "gif" };
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (b.toString("ascii", 4, 8) === "ftyp") return { mime: "video/mp4", ext: "mp4" };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: "video/webm", ext: "webm" };
  return null;
}

async function store(buf: Buffer, mime: string, key: string) {
  if (remote()) {
    const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET}/${key}`, { method: "POST", headers: { ...authHeaders(), "Content-Type": mime }, body: new Uint8Array(buf) });
    if (!r.ok) throw new HttpError(502, "Storage upload failed. Check the bucket name and that it is public.");
    return `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_BUCKET}/${key}`;
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, key), buf);
  return `${env.PUBLIC_URL}/uploads/${key}`;
}

adminMedia.get("/media", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.slice(0, 80) : "";
  res.json({ data: await query<Asset>("select * from media_assets where file_name ilike $1 order by created_at desc limit 200", [`%${q}%`]) });
});

adminMedia.put("/media/upload", express.raw({ type: () => true, limit: "25mb" }), async (req, res) => {
  const buf = req.body as Buffer;
  if (!Buffer.isBuffer(buf) || buf.length === 0) throw new HttpError(400, "No file received");
  const kind = sniff(buf);
  if (!kind) throw new HttpError(400, "Unsupported file. Use PNG, JPG, GIF, WebP, MP4 or WebM.");
  const base = String(req.query.name ?? "file").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "file";
  const key = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${base}.${kind.ext}`;
  const url = await store(buf, kind.mime, key);
  const [row] = await query<Asset>("insert into media_assets (file_name, storage_path, url, mime_type, size_bytes) values ($1,$2,$3,$4,$5) returning *", [`${base}.${kind.ext}`, key, url, kind.mime, buf.length]);
  res.status(201).json({ data: row });
});

adminMedia.delete("/media/:id", async (req, res) => {
  const [a] = await query<Asset>("select * from media_assets where id = $1", [req.params.id]);
  if (!a) throw new HttpError(404, "File not found");
  try {
    if (remote()) await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET}/${a.storage_path}`, { method: "DELETE", headers: authHeaders() });
    else fs.rmSync(path.join(UPLOAD_DIR, path.basename(a.storage_path)), { force: true });
  } catch { /* the database record is still removed */ }
  await query("delete from media_assets where id = $1", [a.id]);
  res.json({ ok: true });
});
