import rateLimit from "express-rate-limit";
const make = (windowMs: number, limit: number, error: string) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error } });
export const apiLimiter = make(60_000, 300, "Too many requests. Please slow down.");
export const authLimiter = make(15 * 60_000, 10, "Too many attempts. Try again in 15 minutes.");
export const contactLimiter = make(60 * 60_000, 5, "Too many messages. Please try again later.");
