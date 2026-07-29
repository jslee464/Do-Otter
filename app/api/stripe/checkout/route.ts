import { NextResponse } from "next/server";
import { PLANS, STRIPE_CONFIGURED, stripe, type Plan } from "../../../../lib/stripe";
import { baseUrl, getUserId, supabaseAdmin } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 로그인 상태에서 호출 → Stripe Checkout 세션 URL 반환
export async function POST(req: Request) {
  if (!STRIPE_CONFIGURED || !stripe)
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let plan: Plan = "pro";
  try {
    const body = await req.json();
    if (body?.plan === "chatpro") plan = "chatpro";
  } catch {}
  const price = PLANS[plan].price;
  if (!price) return NextResponse.json({ error: "no_price" }, { status: 400 });

  const base = baseUrl(req);
  const admin = supabaseAdmin();

  // 고객 재사용 or 생성 (profiles.stripe_customer_id)
  let customerId: string | undefined;
  if (admin) {
    const { data: prof } = await admin
      .from("profiles")
      .select("stripe_customer_id, username")
      .eq("id", userId)
      .single();
    customerId = prof?.stripe_customer_id || undefined;
    if (!customerId) {
      const cust = await stripe.customers.create({
        metadata: { userId },
        name: prof?.username || undefined,
      });
      customerId = cust.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    metadata: { userId, plan },
    success_url: `${base}/?purchase=success`,
    cancel_url: `${base}/?purchase=cancel`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
