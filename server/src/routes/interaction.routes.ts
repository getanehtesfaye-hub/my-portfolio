import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../config/env";
import { query } from "../db/pool";
import { validate } from "../middleware/validate";
import { contactLimiter } from "../middleware/rateLimit";
import { findAnswer } from "../services/chatbot.service";
import { HttpError } from "../utils/errors";

export const publicInteraction = Router();
export const adminContact = Router();

const contactBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, "Message is too short").max(5000),
  website: z.string().optional(), // honeypot: real visitors never fill this
});

publicInteraction.post("/contact", contactLimiter, validate(contactBody), async (req, res) => {
  if (req.body.website) return void res.status(201).json({ ok: true }); // bot: pretend success, store nothing
  const ipHash = crypto.createHash("sha256").update(`${req.ip}${env.JWT_SECRET}`).digest("hex");
  await query("insert into contact_messages (name, email, subject, message, ip_hash) values ($1,$2,$3,$4,$5)",
    [req.body.name, req.body.email, req.body.subject ?? null, req.body.message, ipHash]);
  res.status(201).json({ ok: true });
});

publicInteraction.post("/chatbot/query", validate(z.object({ question: z.string().trim().min(1).max(300) })), async (req, res) => {
  const result = await findAnswer(req.body.question);
  if (result.matched) return void res.json({ matched: true, answer: result.answer });
  const [s] = await query<{ published: { fallbackMessage?: string } }>("select published from site_settings where key = 'chatbot'");
  res.json({ matched: false, answer: s?.published.fallbackMessage ?? "I don't have an answer for that yet. Please use the contact form." });
});

const statusSchema = z.enum(["new", "read", "replied", "archived"]);
adminContact.get("/contact-messages", async (req, res) => {
  const status = statusSchema.safeParse(req.query.status);
  res.json({ data: status.success
    ? await query("select * from contact_messages where status = $1 order by created_at desc limit 200", [status.data])
    : await query("select * from contact_messages order by created_at desc limit 200") });
});
adminContact.patch("/contact-messages/:id", validate(z.object({ status: statusSchema })), async (req, res) => {
  const rows = await query("update contact_messages set status = $1 where id = $2 returning *", [req.body.status, req.params.id]);
  if (!rows.length) throw new HttpError(404, "Message not found");
  res.json({ data: rows[0] });
});
adminContact.delete("/contact-messages/:id", async (req, res) => {
  const rows = await query("delete from contact_messages where id = $1 returning id", [req.params.id]);
  if (!rows.length) throw new HttpError(404, "Message not found");
  res.json({ ok: true });
});
