import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/error";
import { apiLimiter } from "./middleware/rateLimit";
import { routes } from "./routes";
import { UPLOAD_DIR } from "./routes/media.routes";
import { rootRoutes } from "./routes/site.routes";
import { logger } from "./utils/logger";

// Public GETs are cached briefly; admin and auth responses never are.
const publicCache: RequestHandler = (req, res, next) => {
  if (req.method === "GET" && !/^\/(admin|auth)/.test(req.path)) res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  next();
};

export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: [env.CLIENT_ORIGIN, env.ADMIN_ORIGIN].filter((o): o is string => Boolean(o)), credentials: true }));
app.use(compression());
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use("/uploads", (_req, res, next) => { res.set("Cross-Origin-Resource-Policy", "cross-origin"); next(); }, express.static(UPLOAD_DIR, { maxAge: "7d" }));
app.use(rootRoutes);
app.use("/api", apiLimiter, publicCache, routes);
app.use(notFound);
app.use(errorHandler);
