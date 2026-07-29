import { NextResponse } from "next/server";
import { exchangeCode, verifyState } from "../../../../lib/gcal";
import { baseUrl, supabaseAdmin } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 구글 → 여기로 리다이렉트. code 교환 후 refresh_token 저장, 앱으로 복귀.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = baseUrl(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err || !code || !state)
    return NextResponse.redirect(`${base}/?gcal=error`);

  const userId = verifyState(state);
  if (!userId) return NextResponse.redirect(`${base}/?gcal=error`);

  const tok = await exchangeCode(base, code);
  const admin = supabaseAdmin();
  if (tok?.refresh_token && admin) {
    await admin.from("gcal_tokens").upsert({
      user_id: userId,
      refresh_token: tok.refresh_token,
      connected_at: new Date().toISOString(),
    });
    return NextResponse.redirect(`${base}/?gcal=connected`);
  }
  // refresh_token 이 없으면(이미 동의한 계정 등) 재동의 유도
  return NextResponse.redirect(`${base}/?gcal=noretoken`);
}
