import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/errors";

export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, "Not found"));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError)
    return void res.status(400).json({ error: "Please check the highlighted fields", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
  const code = (err as { code?: string }).code;
  if (code === "23505") return void res.status(409).json({ error: "That value is already in use" });
  if (code === "23503") return void res.status(409).json({ error: "This item is linked to other data" });
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong. Please try again." });
};
