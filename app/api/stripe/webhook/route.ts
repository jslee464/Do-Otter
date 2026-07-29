import { NextResponse } from "next/server";
import { planFromPrice, stripe } from "../../../../lib/stripe";
import { supabaseAdmin } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe → 여기로 결제 이벤트. 서명 검증 후 구독 상태를 profiles 에 반영.
export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: "not_configured" }, { status: 400 });
  const sig = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret || "");
  } catch (e: any) {
    return new NextResponse(`webhook signature error: ${e.message}`, { status: 400 });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ received: true, note: "no admin" });

  // 구독 기간 종료 시각(초). Stripe 최신 API 는 items 하위로 이동해서 둘 다 대응.
  const periodEnd = (sub: any): number =>
    sub?.current_period_end ??
    sub?.items?.data?.[0]?.current_period_end ??
    Math.floor(Date.now() / 1000) + 30 * 86400;

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as any;
      const userId = s.client_reference_id || s.metadata?.userId;
      const plan = s.metadata?.plan === "chatpro" ? "chatpro" : "pro";
      if (userId && s.subscription) {
        const sub: any = await stripe.subscriptions.retrieve(s.subscription as string);
        const until = new Date(periodEnd(sub) * 1000).toISOString();
        const col = plan === "chatpro" ? "chatpro_until" : "pro_until";
        await admin
          .from("profiles")
          .update({ [col]: until, stripe_customer_id: s.customer })
          .eq("id", userId);
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as any;
      const plan = planFromPrice(sub.items?.data?.[0]?.price?.id);
      if (plan) {
        const active = sub.status === "active" || sub.status === "trialing";
        const until = active ? new Date(periodEnd(sub) * 1000).toISOString() : null;
        const col = plan === "chatpro" ? "chatpro_until" : "pro_until";
        await admin
          .from("profiles")
          .update({ [col]: until })
          .eq("stripe_customer_id", sub.customer);
      }
    }
  } catch (e: any) {
    return new NextResponse(`handler error: ${e.message}`, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
