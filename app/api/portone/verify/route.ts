import { NextResponse } from "next/server";
import { getPayment, PLANS, PORTONE_CONFIGURED, type Plan } from "../../../../lib/portone";
import { getUserId, supabaseAdmin } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 클라이언트 결제 성공 후 호출 → PortOne 서버에서 실제 결제 검증 → 이용권 부여
export async function POST(req: Request) {
  if (!PORTONE_CONFIGURED)
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let paymentId = "";
  let plan: Plan = "pro";
  try {
    const body = await req.json();
    paymentId = body.paymentId;
    if (body.plan === "pro" || body.plan === "chatpro") plan = body.plan;
  } catch {}
  if (!paymentId) return NextResponse.json({ ok: false, error: "no_payment_id" }, { status: 400 });

  const payment = await getPayment(paymentId);
  if (!payment) return NextResponse.json({ ok: false, error: "not_found" }, { status: 400 });
  if (payment.status !== "PAID")
    return NextResponse.json({ ok: false, error: "not_paid", status: payment.status }, { status: 400 });

  // 금액 위변조 검증
  const expected = PLANS[plan].amount;
  const paid = payment.amount?.total ?? payment.amount?.paid;
  if (paid !== expected)
    return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 400 });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "no_admin" }, { status: 500 });

  const until = new Date(Date.now() + PLANS[plan].days * 86400000).toISOString();
  const entitlement = { pro_until: until, chatpro_until: until };
  const { data: profile, error } = await admin
    .from("profiles")
    .update(entitlement)
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (!profile) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const username =
      (userData.user?.user_metadata?.username as string | undefined) ||
      userData.user?.email?.split("@")[0] ||
      userId.slice(0, 8);
    const { error: upsertError } = await admin
      .from("profiles")
      .upsert({ id: userId, username, ...entitlement }, { onConflict: "id" });
    if (upsertError) {
      return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, until });
}
