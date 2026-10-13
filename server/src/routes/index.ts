import { Router } from "express";
import { csrfGuard, requireAdmin } from "../middleware/auth";
import { authRoutes } from "./auth.routes";
import { adminContent, publicContent } from "./content.routes";
import { adminContact, publicInteraction } from "./interaction.routes";
import { adminSettings, publicSettings } from "./settings.routes";
import { adminAnalytics, publicAnalytics } from "./analytics.routes";
import { adminMedia } from "./media.routes";
import { adminAccount } from "./site.routes";

export const routes = Router();
routes.get("/health", (_req, res) => void res.json({ ok: true }));
routes.use("/auth", authRoutes);
routes.use(publicSettings, publicContent, publicInteraction, publicAnalytics);

const admin = Router();
admin.use(requireAdmin, csrfGuard);
admin.use("/settings", adminSettings);
admin.use(adminContent, adminContact, adminAnalytics, adminMedia, adminAccount);
routes.use("/admin", admin);
