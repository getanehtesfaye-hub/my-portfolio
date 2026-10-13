import { app } from "./app";
import { env } from "./config/env";
import { purgeOldAnalytics } from "./routes/analytics.routes";
import { logger } from "./utils/logger";
app.listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));

const purge = () => purgeOldAnalytics().catch((e) => logger.error(e, "analytics purge failed"));
purge();
setInterval(purge, 24 * 3600 * 1000).unref();
