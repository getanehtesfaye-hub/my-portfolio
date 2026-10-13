import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SETUP_TOKEN: z.string().min(16, "SETUP_TOKEN must be at least 16 characters"),
  CLIENT_ORIGIN: z.string().url(),
  ADMIN_ORIGIN: z.string().url().optional(),
  PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("media"),
});
export const env = schema.parse(process.env);
