import { Router, type Request } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { redis } from "../services/redis.js";
import { dbSelect, dbUpdate } from "../services/insforge.js";
import { config } from "../config.js";
import type { User, BillingCycle, TIER_CONFIG } from "../types/index.js";
import { TIER_CONFIG as TIERS } from "../types/index.js";

export const paymentsRouter = Router();

const DODO_CHECKOUT_BASE = "https://checkout.dodopayments.com/buy";

function paymentLinkId(tier: string, billing: BillingCycle): string | undefined {
  const t = tier.toUpperCase();
  const b = billing.toUpperCase();
  return (
    (config as Record<string, unknown>)[`DODO_CHECKOUT_${t}_${b}`] as string | undefined
    ?? (config as Record<string, unknown>)[`DODO_PRODUCT_${t}_${b}`] as string | undefined
  );
}

// POST /payments/checkout — create Dodo checkout URL
paymentsRouter.post("/checkout", requireAuth, async (req, res) => {
  const { tier, billing = "monthly" } = req.body as {
    tier?: string;
    billing?: BillingCycle;
  };

  if (!tier || !(tier in TIERS)) {
    res.status(400).json({ error: "Invalid tier", code: "INVALID_TIER" });
    return;
  }

  const safeBilling: BillingCycle = billing === "annual" ? "annual" : "monthly";
  const tierConfig = TIERS[tier as keyof typeof TIERS]!;
  const scans = tierConfig[`${safeBilling}_scans`];

  const linkId = paymentLinkId(tier, safeBilling);
  if (!linkId) {
    res.status(500).json({
      error: `Checkout not configured for ${tier}/${safeBilling}`,
      code: "CHECKOUT_NOT_CONFIGURED",
    });
    return;
  }

  let userEmail = "";
  try {
    const users = await dbSelect<User>("app_users", { id: req.userId });
    if (users[0]) userEmail = users[0].email;
  } catch {/* non-fatal */}

  const params = new URLSearchParams({
    quantity: "1",
    redirect_url: `${config.FRONTEND_URL}/dashboard?payment=success`,
    "metadata[user_id]": req.userId,
    "metadata[tier]": tier,
    "metadata[billing]": safeBilling,
    "metadata[scans]": String(scans),
    prefilled_email: userEmail,
  });

  res.json({ data: { checkout_url: `${DODO_CHECKOUT_BASE}/${linkId}?${params}` } });
});

// POST /payments/webhook/dodo — Dodo payment success webhook
paymentsRouter.post(
  "/webhook/dodo",
  // Raw body needed for HMAC — handled by Express json middleware bypass
  async (req: Request & { rawBody?: Buffer }, res) => {
    const raw = req.rawBody;
    const signature = req.headers["webhook-signature"] as string | undefined;

    if (!raw || !signature) {
      res.status(400).json({ error: "Missing signature or body", code: "INVALID_REQUEST" });
      return;
    }

    const expected = createHmac("sha256", config.DODO_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");

    let sigBuffer: Buffer;
    let expBuffer: Buffer;
    try {
      sigBuffer = Buffer.from(signature, "hex");
      expBuffer = Buffer.from(expected, "hex");
    } catch {
      res.status(400).json({ error: "Invalid signature format", code: "INVALID_SIGNATURE" });
      return;
    }

    if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
      res.status(400).json({ error: "Invalid signature", code: "INVALID_SIGNATURE" });
      return;
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw.toString()) as Record<string, unknown>;
    } catch {
      res.status(400).json({ error: "Invalid JSON body", code: "INVALID_REQUEST" });
      return;
    }

    const eventType = (data["type"] ?? data["event"]) as string | undefined;

    if (eventType === "payment.succeeded" || eventType === "payment.success") {
      const payment = data["data"] as Record<string, unknown> | undefined;
      const meta = payment?.["metadata"] as Record<string, string> | undefined;

      const userId = meta?.["user_id"];
      const tier = meta?.["tier"];
      const scans = meta?.["scans"];

      if (userId && tier && scans) {
        try {
          await dbUpdate("app_users", userId, {
            plan_tier: tier,
            scans_remaining: parseInt(scans, 10),
          });
        } catch (err) {
          console.error("[webhook/dodo] Failed to update user:", err);
        }
      }
    }

    res.json({ status: "ok" });
  },
);
