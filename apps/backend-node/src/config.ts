import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  INSFORGE_BASE_URL: z.string().url(),
  INSFORGE_API_KEY: z.string().min(1),
  INSFORGE_PROJECT_ID: z.string().min(1),

  DODO_PAYMENTS_API_KEY: z.string().min(1),
  DODO_WEBHOOK_SECRET: z.string().min(1),

  FRONTEND_URL: z.string().url().default("https://app.unideploy.in"),
  AGENT_SERVICE_URL: z.string().url().default("http://localhost:8001"),

  // Optional — only required for specific tiers
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Dodo checkout link IDs (set in env per tier/billing)
  DODO_CHECKOUT_BUILDER_MONTHLY: z.string().optional(),
  DODO_CHECKOUT_BUILDER_ANNUAL: z.string().optional(),
  DODO_CHECKOUT_PRO_MONTHLY: z.string().optional(),
  DODO_CHECKOUT_PRO_ANNUAL: z.string().optional(),
  DODO_CHECKOUT_ENTERPRISE_MONTHLY: z.string().optional(),
  DODO_CHECKOUT_ENTERPRISE_ANNUAL: z.string().optional(),
  // Legacy naming
  DODO_PRODUCT_BUILDER_MONTHLY: z.string().optional(),
  DODO_PRODUCT_BUILDER_ANNUAL: z.string().optional(),
  DODO_PRODUCT_PRO_MONTHLY: z.string().optional(),
  DODO_PRODUCT_PRO_ANNUAL: z.string().optional(),
  DODO_PRODUCT_ENTERPRISE_MONTHLY: z.string().optional(),
  DODO_PRODUCT_ENTERPRISE_ANNUAL: z.string().optional(),
});

const envToParse = {
  ...process.env,
  DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY,
};

const parsed = schema.safeParse(envToParse);

if (!parsed.success) {
  console.error("❌  Missing or invalid environment variables:\n");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
