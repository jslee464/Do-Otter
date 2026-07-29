/* =====================================================================
 *  Stripe (서버 전용) — 구독 결제
 *  ⚠️ STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET 은 서버 전용 비밀.
 * ===================================================================== */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
export const STRIPE_CONFIGURED = Boolean(key);
export const stripe = key ? new Stripe(key) : null;

export type Plan = "pro" | "chatpro";

export const PLANS: Record<Plan, { price: string; label: string }> = {
  pro: { price: process.env.STRIPE_PRICE_PRO || "", label: "Pro 수달" },
  chatpro: { price: process.env.STRIPE_PRICE_CHATPRO || "", label: "수달 Chat Pro" },
};

export function planFromPrice(priceId?: string): Plan | null {
  if (!priceId) return null;
  if (priceId === PLANS.pro.price) return "pro";
  if (priceId === PLANS.chatpro.price) return "chatpro";
  return null;
}
