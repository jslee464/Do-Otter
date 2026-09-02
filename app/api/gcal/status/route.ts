import { NextResponse } from "next/server";
import { GCAL_CONFIGURED } from "../../../../lib/gcal";
import { getUserId, supabaseAdmin } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 사용자가 구글 캘린더를 연동했는지 여부
export async function POST(req: Request) {
  if (!GCAL_CONFIGURED) return NextResponse.json({ connected: false, configured: false });
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ connected: false, configured: true });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ connected: false, configured: false });
  const { data } = await admin
    .from("gcal_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return NextResponse.json({ connected: !!data, configured: true });
}
