import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.token as string | undefined;
  if (!token) return next(new HttpError(401, "Please sign in"));
  try {
    req.adminId = (jwt.verify(token, env.JWT_SECRET) as { sub: string }).sub;
    next();
  } catch {
    next(new HttpError(401, "Your session expired. Please sign in again"));
  }
};

// CSRF: cookies are SameSite and CORS only allows our origins; a custom header forces a preflight on cross-site calls.
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("x-requested-with") !== "portfolio-admin") return next(new HttpError(403, "Request blocked"));
  next();
};
