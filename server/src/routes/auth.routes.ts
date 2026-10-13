import { Router, type CookieOptions } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { query } from "../db/pool";
import { requireAdmin } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { HttpError } from "../utils/errors";

const email = z.string().trim().toLowerCase().email().max(254);
const setupBody = z.object({ email, password: z.string().min(12, "Use at least 12 characters").max(128), setupToken: z.string() });
const loginBody = z.object({ email, password: z.string().min(1).max(128) });

const prod = env.NODE_ENV === "production";
const cookieBase: CookieOptions = { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" };
const DUMMY_HASH = bcrypt.hashSync("placeholder-password", 12); // keeps login timing equal for unknown emails
const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const authRoutes = Router();

authRoutes.get("/setup-status", async (_req, res) => {
  const [row] = await query<{ count: string }>("select count(*) from admins");
  res.json({ needsSetup: row.count === "0" });
});

authRoutes.post("/setup", authLimiter, validate(setupBody), async (req, res) => {
  if (!same(req.body.setupToken, env.SETUP_TOKEN)) throw new HttpError(403, "Invalid setup token");
  const hash = await bcrypt.hash(req.body.password, 12);
  const rows = await query("insert into admins (email, password_hash) select $1, $2 where not exists (select 1 from admins) returning id", [req.body.email, hash]);
  if (!rows.length) throw new HttpError(409, "Setup is already complete");
  res.status(201).json({ ok: true });
});

authRoutes.post("/login", authLimiter, validate(loginBody), async (req, res) => {
  const [admin] = await query<{ id: string; email: string; password_hash: string }>("select id, email, password_hash from admins where email = $1", [req.body.email]);
  const ok = await bcrypt.compare(req.body.password, admin?.password_hash ?? DUMMY_HASH);
  if (!admin || !ok) throw new HttpError(401, "Incorrect email or password");
  const token = jwt.sign({ sub: admin.id }, env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { ...cookieBase, maxAge: 7 * 24 * 3600 * 1000 }).json({ admin: { id: admin.id, email: admin.email } });
});

authRoutes.post("/logout", (_req, res) => void res.clearCookie("token", cookieBase).json({ ok: true }));

authRoutes.get("/me", requireAdmin, async (req, res) => {
  const [admin] = await query("select id, email from admins where id = $1", [req.adminId]);
  if (!admin) throw new HttpError(401, "Please sign in");
  res.json({ admin });
});
